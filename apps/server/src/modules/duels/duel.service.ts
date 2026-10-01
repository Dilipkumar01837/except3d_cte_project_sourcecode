import { prisma } from '../../shared/lib/prisma.js';
import type { ProgrammingLanguage } from '@prisma/client';
import { emitToUser } from '../../shared/lib/socket.js';
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

export async function createDuel(userId: string, challengeId: string) {
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, isPublished: true },
    select: { id: true },
  });
  if (!challenge) return null;

  return prisma.duelMatch.create({
    data: { creatorId: userId, challengeId },
    select: duelSelect,
  });
}

export async function joinDuel(userId: string, duelId: string) {
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
  const submission = await prisma.submission.create({
    data: { userId, duelId: duel.id, challengeId: duel.challengeId, language, sourceCode },
  });
  try {
    await enqueueSubmission(submission.id);
  } catch {
    // Redis queue offline
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
