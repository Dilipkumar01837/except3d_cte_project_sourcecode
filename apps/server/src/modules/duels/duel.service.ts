import { prisma } from '../../shared/lib/prisma.js';
import type { ProgrammingLanguage } from '@prisma/client';
import { emitToUser } from '../../shared/lib/socket.js';
import { enqueueSubmission } from '../challenges/execution.queue.js';

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
    where: { status: 'OPEN', opponentId: null },
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
  const result = await prisma.duelMatch.updateMany({
    where: { id: duelId, status: 'OPEN', opponentId: null, creatorId: { not: userId } },
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
    where: { id: duelId, status: 'ACTIVE', OR: [{ creatorId: userId }, { opponentId: userId }] },
    select: { id: true, challengeId: true, challenge: { select: { supportedLanguages: true } } },
  });
  if (!duel) return null;
  if (!duel.challenge.supportedLanguages.includes(language)) return null;
  const submission = await prisma.submission.create({
    data: { userId, duelId: duel.id, challengeId: duel.challengeId, language, sourceCode },
  });
  await enqueueSubmission(submission.id);
  return submission;
}
