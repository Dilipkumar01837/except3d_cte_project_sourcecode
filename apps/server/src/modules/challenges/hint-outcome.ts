import type { Prisma } from '@prisma/client';

/**
 * Engagement-only outcome signal.
 *
 * When a player gets an accepted submission we record that every hint they had
 * received for that challenge preceded a solve. This does not claim the hint
 * caused the solve, and an optional self-reported "helpful" flag is never read
 * as evidence of learning. Kept as its own function so the transaction-scoped
 * update is unit-testable without the execution worker (and its Redis queue).
 */
export async function markHintsResolved(
  tx: Prisma.TransactionClient,
  input: { userId: string; challengeId: string; resolvedAt: Date },
): Promise<void> {
  const { userId, challengeId, resolvedAt } = input;
  await tx.aiHintHistory.updateMany({
    where: { userId, challengeId, resolvedAfter: false },
    data: { resolvedAfter: true, resolvedAt },
  });
  await tx.playerHintReveal.updateMany({
    where: { userId, hint: { challengeId }, resolvedAfter: false },
    data: { resolvedAfter: true, resolvedAt },
  });
}
