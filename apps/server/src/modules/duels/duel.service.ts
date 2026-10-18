import { prisma } from '../../shared/lib/prisma.js';
import type { ProgrammingLanguage } from '@prisma/client';
import { emitToDuel, emitToUser } from '../../shared/lib/socket.js';
import { redis } from '../../shared/lib/redis.js';
import { enqueueSubmission } from '../challenges/execution.queue.js';
import { env } from '../../config/index.js';
import { activeDuelCutoff, openDuelCutoff, type DuelWindows } from './duel-expiry.js';

const windows: DuelWindows = {
  openMs: env.duelOpenTimeoutMs,
  activeMs: env.duelActiveTimeoutMs,
};

const duelSelect = {
  id: true,
  status: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  winnerId: true,
  challenge: { select: { id: true, slug: true, title: true } },
  creator: { select: { id: true, username: true } },
  opponent: { select: { id: true, username: true } },
  submissions: {
    select: {
      id: true,
      userId: true,
      status: true,
      score: true,
      executionTimeMs: true,
      createdAt: true,
      completedAt: true,
      user: { select: { username: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const;

export async function listOpenDuels() {
  return prisma.duelMatch.findMany({
    where: {
      status: 'OPEN',
      opponentId: null,
      // Hide lobbies past their open window even before the sweeper closes them,
      // so they are never shown as joinable.
      createdAt: { gt: openDuelCutoff(new Date(), windows) },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: duelSelect,
  });
}

/**
 * Blocks a second concurrent duel for a user. Only ACTIVE duels count: an OPEN
 * lobby is just a pending invitation with no opponent yet, and since there is no
 * lobby-cancel endpoint, gating on OPEN would soft-lock a user for the full
 * 24h open timeout. Every duel-creating path funnels through createDuel or
 * joinDuel (REST lobby and ranked matchmaking), so this is the single choke
 * point. The check-then-write is not atomic across concurrent requests, but a
 * lost race still cannot produce two ACTIVE duels for the *opponent* (join is an
 * atomic updateMany) and the window is a single round-trip.
 */
export async function hasActiveDuel(userId: string): Promise<boolean> {
  const active = await prisma.duelMatch.findFirst({
    where: { status: 'ACTIVE', OR: [{ creatorId: userId }, { opponentId: userId }] },
    select: { id: true },
  });
  return active !== null;
}

export async function createDuel(userId: string, challengeId: string) {
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, isPublished: true },
    select: { id: true },
  });
  if (!challenge) return null;
  if (await hasActiveDuel(userId)) return null;

  return prisma.duelMatch.create({
    data: { creatorId: userId, challengeId },
    select: duelSelect,
  });
}

export async function joinDuel(userId: string, duelId: string) {
  if (await hasActiveDuel(userId)) return null;
  // The cutoff is part of the update predicate, not a separate read: a duel past
  // its open window is not joinable even if the sweeper has not closed it yet,
  // and doing it in one statement avoids a read-then-write race.
  const result = await prisma.duelMatch.updateMany({
    where: {
      id: duelId,
      status: 'OPEN',
      opponentId: null,
      creatorId: { not: userId },
      createdAt: { gt: openDuelCutoff(new Date(), windows) },
    },
    data: { opponentId: userId, status: 'ACTIVE', startedAt: new Date() },
  });
  if (result.count === 0) return null;

  const duel = await prisma.duelMatch.findUnique({ where: { id: duelId }, select: duelSelect });
  if (!duel || !duel.opponent) return null;
  const event = { duelId: duel.id, status: duel.status, challenge: duel.challenge };
  emitToDuel(duel.id, 'duel:started', event);
  emitToUser(duel.creator.id, 'duel:started', event);
  emitToUser(duel.opponent.id, 'duel:started', event);
  return duel;
}

export async function getDuel(userId: string, duelId: string) {
  return prisma.duelMatch.findFirst({
    where: { id: duelId, OR: [{ creatorId: userId }, { opponentId: userId }] },
    select: duelSelect,
  });
}

export async function createDuelSubmission(
  userId: string,
  duelId: string,
  language: ProgrammingLanguage,
  sourceCode: string,
) {
  const duel = await prisma.duelMatch.findFirst({
    where: {
      id: duelId,
      status: 'ACTIVE',
      OR: [{ creatorId: userId }, { opponentId: userId }],
      // Reject submissions to a duel that is already past its active window, so a
      // late submission cannot win a duel that is logically over.
      startedAt: { gt: activeDuelCutoff(new Date(), windows) },
    },
    select: { id: true, challengeId: true, challenge: { select: { supportedLanguages: true } } },
  });
  if (!duel) return null;
  if (!duel.challenge.supportedLanguages.includes(language)) return null;
  // Simultaneous-start gate: once the realtime arena has loaded this duel (its
  // live state exists), submissions stay closed until both players are ready —
  // the same condition that fires the countdown. The key is the one written by
  // duel-realtime.ts (`cte:duel:${duelId}:live`), duplicated rather than
  // imported because duel-realtime already imports this module. With no live
  // state yet (pure REST flow, arena never opened) or a Redis outage, the gate
  // is skipped and the guards above still apply; the shipped client always
  // joins the arena, so a real countdown is always enforced.
  const liveRaw = await redis.get(`cte:duel:${duel.id}:live`).catch(() => null);
  if (liveRaw) {
    try {
      const players = Object.values(
        (JSON.parse(liveRaw) as { players?: Record<string, { ready?: boolean }> }).players ?? {},
      );
      const bothReady = players.length === 2 && players.every((player) => player.ready === true);
      if (!bothReady) return null;
    } catch {
      // Unreadable live state: fall through and let the guards above decide.
    }
  }
  const submission = await prisma.submission.create({
    data: { userId, duelId: duel.id, challengeId: duel.challengeId, language, sourceCode },
  });
  try {
    await enqueueSubmission(submission.id);
  } catch (error) {
    // The queue is unavailable. Mirror challenge.controller.ts: mark the
    // submission as INTERNAL_ERROR immediately so neither the player nor the
    // duel sweeper sees it stuck forever in QUEUED.
    process.stderr.write(
      `[duels] queue unavailable — marking submission ${submission.id} as INTERNAL_ERROR: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'INTERNAL_ERROR',
        compilerOutput: 'The execution queue is currently unavailable. Please try again shortly.',
        completedAt: new Date(),
      },
    });
  }
  return submission;
}

/**
 * Closes duels that passed their time window with no result.
 *
 * Returns the duels it cancelled so the caller can log them and so tests can
 * assert on the outcome. Waiting lobbies and running duels are swept separately
 * because they expire on different clocks (createdAt vs startedAt).
 */
export async function expireStaleDuels(now = new Date()): Promise<number> {
  const [staleOpen, staleActive] = await Promise.all([
    prisma.duelMatch.findMany({
      where: { status: 'OPEN', createdAt: { lte: openDuelCutoff(now, windows) } },
      select: { id: true, creatorId: true, opponentId: true },
    }),
    prisma.duelMatch.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ startedAt: { lte: activeDuelCutoff(now, windows) } }, { startedAt: null }],
      },
      select: { id: true, creatorId: true, opponentId: true },
    }),
  ]);

  const stale = [...staleOpen, ...staleActive];
  let cancelled = 0;
  for (const duel of stale) {
    // Conditional update so an in-flight accepted submission that wins the duel
    // first is not overwritten by the sweep.
    const result = await prisma.duelMatch.updateMany({
      where: { id: duel.id, status: { in: ['OPEN', 'ACTIVE'] }, winnerId: null },
      data: { status: 'CANCELLED', completedAt: now },
    });
    if (result.count === 0) continue;
    cancelled += 1;
    const event = { duelId: duel.id, status: 'CANCELLED' as const };
    emitToUser(duel.creatorId, 'duel:completed', event);
    if (duel.opponentId) emitToUser(duel.opponentId, 'duel:completed', event);
  }
  return cancelled;
}

/** Runs {@link expireStaleDuels} on an interval. Returns a stop function. */
export function startDuelSweeper(intervalMs = env.duelSweepIntervalMs): () => void {
  const timer = setInterval(() => {
    void expireStaleDuels()
      .then((count) => {
        if (count > 0) {
          process.stderr.write(`[duels] cancelled ${String(count)} expired duel(s)\n`);
        }
      })
      .catch((err: unknown) => {
        process.stderr.write(`[duels] expiry sweep failed: ${String(err)}\n`);
      });
  }, intervalMs);
  // Do not hold the event loop open just for the sweeper.
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}
