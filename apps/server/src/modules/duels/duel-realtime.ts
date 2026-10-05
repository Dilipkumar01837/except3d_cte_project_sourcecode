import { Redis } from 'ioredis';
import type { Server as SocketServer, Socket } from 'socket.io';
import { ProgrammingLanguage } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../config/index.js';
import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { verifyAccessToken } from '../../shared/lib/jwt.js';
import { emitToDuel } from '../../shared/lib/socket.js';
import { createDuelSubmission } from './duel.service.js';

const duelKey = (duelId: string) => `cte:duel:${duelId}:live`;
const channel = 'cte:duel:events';
const MAX_CODE = 100_000;

const codeUpdateSchema = z.object({
  code: z.string().max(MAX_CODE),
  language: z.string().max(20),
  cursor: z
    .object({ line: z.number().int().min(1).max(100_000), column: z.number().int().min(1) })
    .optional(),
  selection: z.object({ start: z.number().int().min(0), end: z.number().int().min(0) }).optional(),
});
const progressSchema = z.object({
  passed: z.number().int().min(0).max(10_000),
  total: z.number().int().min(0).max(10_000),
  elapsedMs: z.number().int().min(0).max(86_400_000),
  language: z.string().max(20),
  status: z.enum(['IDLE', 'RUNNING', 'SUBMITTED', 'JUDGING', 'COMPLETED']),
});
const submitSchema = z.object({
  language: z.string().max(20),
  sourceCode: z.string().min(1).max(MAX_CODE),
});
const chatSchema = z.object({ message: z.string().trim().min(1).max(500) });

type LiveState = {
  players: Record<
    string,
    { ready: boolean; code: string; language: string; progress: z.infer<typeof progressSchema> }
  >;
  spectators: number;
  startedAt: string | null;
};
type DuelSocketData = {
  userId?: string;
  duelId?: string;
  spectator?: boolean;
  codeAt?: number;
  chatAt?: number;
};

async function loadState(duelId: string): Promise<LiveState> {
  const raw = await redis.get(duelKey(duelId));
  if (raw) return JSON.parse(raw) as LiveState;
  const duel = await prisma.duelMatch.findUnique({
    where: { id: duelId },
    select: { creatorId: true, opponentId: true, startedAt: true },
  });
  if (!duel) throw new Error('DUEL_NOT_FOUND');
  const players: LiveState['players'] = {};
  for (const userId of [duel.creatorId, duel.opponentId].filter((id): id is string =>
    Boolean(id),
  )) {
    players[userId] = {
      ready: false,
      code: '',
      language: 'PYTHON',
      progress: { passed: 0, total: 0, elapsedMs: 0, language: 'PYTHON', status: 'IDLE' },
    };
  }
  const state: LiveState = {
    players,
    spectators: 0,
    startedAt: duel.startedAt?.toISOString() ?? null,
  };
  await redis.setex(duelKey(duelId), 86_400, JSON.stringify(state));
  return state;
}

async function saveState(duelId: string, state: LiveState): Promise<void> {
  await redis.setex(duelKey(duelId), 86_400, JSON.stringify(state));
}

async function access(duelId: string, userId: string) {
  const duel = await prisma.duelMatch.findUnique({
    where: { id: duelId },
    select: { creatorId: true, opponentId: true, status: true },
  });
  if (!duel) return null;
  return { duel, participant: duel.creatorId === userId || duel.opponentId === userId };
}

function identity(socket: Socket): string {
  return (socket.data as DuelSocketData).userId ?? '';
}

export async function publishDuelEvent(
  duelId: string,
  event: string,
  data: unknown,
): Promise<void> {
  await redis.publish(channel, JSON.stringify({ duelId, event, data }));
}

export function attachDuelRealtime(io: SocketServer): void {
  const namespace = io.of('/duel');
  namespace.use((socket, next) => {
    const token = (socket.handshake.auth as Record<string, unknown>)['token'];
    if (typeof token !== 'string') {
      next(new Error('UNAUTHORIZED'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      void prisma.user
        .findUnique({ where: { id: payload.sub }, select: { isActive: true } })
        .then((user) => {
          if (!user?.isActive) {
            next(new Error('UNAUTHORIZED'));
            return;
          }
          (socket.data as DuelSocketData).userId = payload.sub;
          next();
        })
        .catch(() => {
          next(new Error('UNAUTHORIZED'));
        });
      return;
    } catch {
      next(new Error('UNAUTHORIZED'));
      return;
    }
  });

  namespace.on('connection', (socket) => {
    const socketData = socket.data as DuelSocketData;
    socket.on('duel:join', async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = z
        .object({ duelId: z.string().uuid(), spectator: z.boolean().optional() })
        .safeParse(payload);
      if (!parsed.success) return ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
      const { duelId, spectator = false } = parsed.data;
      const result = await access(duelId, identity(socket));
      if (!result || (!result.participant && !spectator))
        return ack?.({ ok: false, error: 'FORBIDDEN' });
      const state = await loadState(duelId);
      await socket.join(`duel:${duelId}`);
      if (!result.participant) {
        state.spectators += 1;
        await saveState(duelId, state);
        socketData.spectator = true;
        socket.emit('duel:spectator-join', { duelId, count: state.spectators });
      } else {
        socketData.spectator = false;
      }
      socketData.duelId = duelId;
      socket.emit('duel:state', { duelId, state });
      ack?.({ ok: true, state });
    });

    socket.on('duel:ready', async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = z.object({ duelId: z.string().uuid(), ready: z.boolean() }).safeParse(payload);
      if (!parsed.success || socketData.spectator) {
        ack?.({ ok: false, error: 'FORBIDDEN' });
        return;
      }
      const { duelId, ready } = parsed.data;
      const result = await access(duelId, identity(socket));
      if (!result?.participant) return ack?.({ ok: false, error: 'FORBIDDEN' });
      const state = await loadState(duelId);
      state.players[identity(socket)] ??= {
        ready: false,
        code: '',
        language: 'PYTHON',
        progress: { passed: 0, total: 0, elapsedMs: 0, language: 'PYTHON', status: 'IDLE' },
      };
      const player = state.players[identity(socket)];
      if (player) player.ready = ready;
      const allReady =
        Object.values(state.players).length === 2 &&
        Object.values(state.players).every((player) => player.ready);
      await saveState(duelId, state);
      namespace
        .to(`duel:${duelId}`)
        .emit('duel:ready', { duelId, userId: identity(socket), ready });
      if (allReady) {
        namespace.to(`duel:${duelId}`).emit('duel:countdown', { duelId, seconds: 3 });
        setTimeout(
          () => namespace.to(`duel:${duelId}`).emit('duel:countdown', { duelId, seconds: 2 }),
          1_000,
        ).unref();
        setTimeout(
          () => namespace.to(`duel:${duelId}`).emit('duel:countdown', { duelId, seconds: 1 }),
          2_000,
        ).unref();
        setTimeout(
          () => namespace.to(`duel:${duelId}`).emit('duel:started', { duelId }),
          3_000,
        ).unref();
      }
      ack?.({ ok: true });
    });

    socket.on('duel:code-update', async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = codeUpdateSchema.extend({ duelId: z.string().uuid() }).safeParse(payload);
      if (
        !parsed.success ||
        socketData.spectator ||
        (socketData.codeAt !== undefined && Date.now() - socketData.codeAt < 50)
      ) {
        ack?.({ ok: false, error: 'RATE_LIMITED' });
        return;
      }
      socketData.codeAt = Date.now();
      const result = await access(parsed.data.duelId, identity(socket));
      if (!result?.participant || result.duel.status !== 'ACTIVE')
        return ack?.({ ok: false, error: 'FORBIDDEN' });
      const state = await loadState(parsed.data.duelId);
      state.players[identity(socket)] = {
        ...(state.players[identity(socket)] ?? {
          ready: false,
          progress: { passed: 0, total: 0, elapsedMs: 0, status: 'IDLE' as const },
        }),
        code: parsed.data.code,
        language: parsed.data.language,
        progress: state.players[identity(socket)]?.progress ?? {
          passed: 0,
          total: 0,
          elapsedMs: 0,
          language: parsed.data.language,
          status: 'IDLE',
        },
      };
      await saveState(parsed.data.duelId, state);
      socket
        .to(`duel:${parsed.data.duelId}`)
        .emit('duel:code-update', { ...parsed.data, userId: identity(socket) });
      ack?.({ ok: true });
    });

    socket.on('duel:progress-update', async (payload: unknown) => {
      const parsed = progressSchema.extend({ duelId: z.string().uuid() }).safeParse(payload);
      if (!parsed.success || socketData.spectator) return;
      const result = await access(parsed.data.duelId, identity(socket));
      if (!result?.participant) return;
      const state = await loadState(parsed.data.duelId);
      const player = state.players[identity(socket)];
      if (player) player.progress = parsed.data;
      await saveState(parsed.data.duelId, state);
      socket
        .to(`duel:${parsed.data.duelId}`)
        .emit('duel:progress-update', { ...parsed.data, userId: identity(socket) });
    });

    socket.on('duel:submit', async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = submitSchema.extend({ duelId: z.string().uuid() }).safeParse(payload);
      if (!parsed.success || socketData.spectator) {
        ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }
      const result = await access(parsed.data.duelId, identity(socket));
      if (!result?.participant) return ack?.({ ok: false, error: 'FORBIDDEN' });
      if (!Object.values(ProgrammingLanguage).includes(parsed.data.language as ProgrammingLanguage))
        return ack?.({ ok: false, error: 'INVALID_LANGUAGE' });
      const submission = await createDuelSubmission(
        identity(socket),
        parsed.data.duelId,
        parsed.data.language as ProgrammingLanguage,
        parsed.data.sourceCode,
      );
      if (!submission) return ack?.({ ok: false, error: 'DUEL_UNAVAILABLE' });
      namespace
        .to(`duel:${parsed.data.duelId}`)
        .emit('duel:progress-update', {
          duelId: parsed.data.duelId,
          userId: identity(socket),
          passed: 0,
          total: 0,
          elapsedMs: 0,
          language: parsed.data.language,
          status: 'SUBMITTED',
        });
      ack?.({ ok: true, submissionId: submission.id });
    });

    socket.on('duel:chat-message', async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = chatSchema.extend({ duelId: z.string().uuid() }).safeParse(payload);
      if (
        !parsed.success ||
        (socketData.chatAt !== undefined && Date.now() - socketData.chatAt < 500)
      ) {
        ack?.({ ok: false, error: 'RATE_LIMITED' });
        return;
      }
      const result = await access(parsed.data.duelId, identity(socket));
      if (!result) return ack?.({ ok: false, error: 'FORBIDDEN' });
      socketData.chatAt = Date.now();
      namespace
        .to(`duel:${parsed.data.duelId}`)
        .emit('duel:chat-message', {
          duelId: parsed.data.duelId,
          userId: identity(socket),
          message: parsed.data.message,
        });
      ack?.({ ok: true });
    });

    socket.on('disconnect', async () => {
      const duelId = socketData.duelId;
      if (!duelId || !socketData.spectator) return;
      const state = await loadState(duelId).catch(() => null);
      if (!state) return;
      state.spectators = Math.max(0, state.spectators - 1);
      await saveState(duelId, state);
      namespace
        .to(`duel:${duelId}`)
        .emit('duel:spectator-leave', { duelId, count: state.spectators });
    });
  });

  const subscriber = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  subscriber.on('error', () => undefined);
  void subscriber
    .connect()
    .then(() => subscriber.subscribe(channel))
    .catch(() => undefined);
  subscriber.on('message', (_channel, raw) => {
    try {
      const event = JSON.parse(raw) as { duelId: string; event: string; data: unknown };
      emitToDuel(event.duelId, event.event, event.data);
    } catch {
      // Ignore malformed cross-process messages.
    }
  });
}
