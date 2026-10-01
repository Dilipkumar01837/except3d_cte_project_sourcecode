import { prisma } from '../../shared/lib/prisma.js';

export interface DuelCandidate {
  userId: string;
  score: number;
  completedAt: Date | null;
  submittedAt: Date;
}

/**
 * Winner by score, then by who finished earliest. Returns null only for an exact
 * score-and-time tie (a draw). Pure, so the tie-break rules are testable without
 * a database.
 */
export function pickDuelWinner(a: DuelCandidate, b: DuelCandidate): string | null {
  if (a.score !== b.score) return a.score > b.score ? a.userId : b.userId;
  const aTime = (a.completedAt ?? a.submittedAt).getTime();
  const bTime = (b.completedAt ?? b.submittedAt).getTime();
  if (aTime !== bTime) return aTime < bTime ? a.userId : b.userId;
  return null;
}

function rank(a: DuelCandidate, b: DuelCandidate): number {
  if (a.score !== b.score) return b.score - a.score;
  return (a.completedAt ?? a.submittedAt).getTime() - (b.completedAt ?? b.submittedAt).getTime();
}

export interface DuelResolution {
  /** True only if this call performed the ACTIVE -> COMPLETED transition. */
  resolved: boolean;
  winnerId: string | null;
  creatorId: string;
  opponentId: string | null;
}

/**
 * Resolve a duel from its accepted submissions. Unlike "first accepted wins",
 * the duel is only completed once BOTH players have an accepted submission, then
 * the higher score (earliest finish as tie-break) wins. If only one player has
 * finished, the duel stays ACTIVE so the other result can still decide it; the
 * expiry sweeper cancels a duel whose opponent never finishes.
 */
export async function resolveDuel(duelId: string): Promise<DuelResolution | null> {
  const duel = await prisma.duelMatch.findUnique({
    where: { id: duelId },
    select: { creatorId: true, opponentId: true, status: true, winnerId: true },
  });
  if (!duel) return null;
  if (duel.status !== 'ACTIVE') {
    return {
      resolved: false,
      winnerId: duel.winnerId,
      creatorId: duel.creatorId,
      opponentId: duel.opponentId,
    };
  }

  const submissions = await prisma.submission.findMany({
    where: { duelId, status: 'ACCEPTED' },
    select: { userId: true, score: true, completedAt: true, createdAt: true },
  });
  const bestByUser = new Map<string, DuelCandidate>();
  for (const item of submissions) {
    const candidate: DuelCandidate = {
      userId: item.userId,
      score: item.score,
      completedAt: item.completedAt,
      submittedAt: item.createdAt,
    };
    const existing = bestByUser.get(item.userId);
    bestByUser.set(item.userId, existing && rank(existing, candidate) <= 0 ? existing : candidate);
  }

  const ranked = [...bestByUser.values()].sort(rank);
  const first = ranked[0];
  const second = ranked[1];
  if (!first || !second) {
    return {
      resolved: false,
      winnerId: null,
      creatorId: duel.creatorId,
      opponentId: duel.opponentId,
    };
  }
  const winnerId = pickDuelWinner(first, second);

  const update = await prisma.duelMatch.updateMany({
    where: { id: duelId, status: 'ACTIVE' },
    data: { status: 'COMPLETED', winnerId, completedAt: new Date() },
  });
  return {
    resolved: update.count > 0,
    winnerId,
    creatorId: duel.creatorId,
    opponentId: duel.opponentId,
  };
}
