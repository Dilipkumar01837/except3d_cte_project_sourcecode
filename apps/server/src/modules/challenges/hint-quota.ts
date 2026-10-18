import { type ProgrammingLanguage } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';

export interface HintQuota {
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

export class HintQuotaExceededError extends Error {}

/**
 * Metered AI-hint allowance for one account, backed by durable AiHintHistory
 * rows (so the count is per user and survives restarts). The window is rolling:
 * the oldest hint in the window determines when the next slot frees up.
 */
export async function getHintQuota(
  userId: string,
  options: { windowMs: number; limit: number; now?: Date },
): Promise<HintQuota> {
  const now = options.now ?? new Date();
  const windowStart = new Date(now.getTime() - options.windowMs);
  const window = { userId, createdAt: { gte: windowStart } };
  const [used, oldest] = await Promise.all([
    prisma.aiHintHistory.count({ where: window }),
    prisma.aiHintHistory.findFirst({
      where: window,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);
  return {
    limit: options.limit,
    used,
    remaining: Math.max(0, options.limit - used),
    resetAt: oldest
      ? new Date(oldest.createdAt.getTime() + options.windowMs)
      : new Date(now.getTime() + options.windowMs),
  };
}

/**
 * Atomically check the rolling-window allowance and consume one slot by
 * inserting the AiHintHistory row *before* the (up to 15s) provider call, so
 * parallel requests cannot all pass a read-only count and then all insert. The
 * count+insert pair runs in one transaction behind a per-account advisory lock;
 * on Postgres a bare count under READ COMMITTED would let two transactions
 * interleave and overshoot the limit. Callers that fail after reserving must
 * delete the returned row to release the slot.
 */
export async function reserveHintSlot(
  userId: string,
  options: { windowMs: number; limit: number },
  insert: { challengeId: string; language: ProgrammingLanguage },
): Promise<{ reservationId: string; quota: HintQuota }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - options.windowMs);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hint-quota:${userId}`}))`;
    const used = await tx.aiHintHistory.count({
      where: { userId, createdAt: { gte: windowStart } },
    });
    if (used >= options.limit) throw new HintQuotaExceededError();
    const row = await tx.aiHintHistory.create({
      data: {
        userId,
        challengeId: insert.challengeId,
        language: insert.language,
        hint: '',
      },
      select: { id: true, createdAt: true },
    });
    const oldest = await tx.aiHintHistory.findFirst({
      where: { userId, createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    return {
      reservationId: row.id,
      quota: {
        limit: options.limit,
        used: used + 1,
        remaining: Math.max(0, options.limit - used - 1),
        resetAt: new Date((oldest?.createdAt ?? row.createdAt).getTime() + options.windowMs),
      },
    };
  });
}
