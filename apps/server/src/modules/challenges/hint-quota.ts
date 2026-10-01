import { prisma } from '../../shared/lib/prisma.js';

export interface HintQuota {
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

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
