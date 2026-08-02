/**
 * Redis leaderboard service using sorted sets.
 *
 * Architecture:
 *   - Key: cte:leaderboard:global   — all-time XP sorted set (score = xp)
 *   - Key: cte:leaderboard:weekly   — weekly XP sorted set (TTL refreshed on claim)
 *   - Members: userId strings
 *
 * TTL / Invalidation:
 *   - Global leaderboard: permanent, updated on every submission acceptance and daily reward claim
 *   - Weekly leaderboard: expires at end of ISO week (7 days max TTL, set on each write)
 *   - Leaderboard reads are O(log N + K) for top-K and individual rank queries
 *   - Cache is updated atomically alongside DB writes in the execution worker / daily reward service
 *
 * Rank is 0-indexed from Redis (highest score = rank 0); we expose 1-indexed to clients.
 */

import { redis } from './redis.js';

export const LEADERBOARD_GLOBAL = 'cte:leaderboard:global';
export const LEADERBOARD_WEEKLY = 'cte:leaderboard:weekly';
const WEEKLY_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function updateLeaderboard(userId: string, xpDelta: number): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.zincrby(LEADERBOARD_GLOBAL, xpDelta, userId);
  pipeline.zincrby(LEADERBOARD_WEEKLY, xpDelta, userId);
  pipeline.expire(LEADERBOARD_WEEKLY, WEEKLY_TTL_SECONDS);
  await pipeline.exec();
}

export async function getTopPlayers(
  key: string,
  count: number,
): Promise<Array<{ userId: string; xp: number; rank: number }>> {
  // ZREVRANGE returns highest scores first
  const results = await redis.zrevrange(key, 0, count - 1, 'WITHSCORES');
  const out: Array<{ userId: string; xp: number; rank: number }> = [];
  for (let i = 0; i < results.length; i += 2) {
    const userId = results[i];
    const xp = Number(results[i + 1]);
    if (userId !== undefined) {
      out.push({ userId, xp, rank: Math.floor(i / 2) + 1 });
    }
  }
  return out;
}

export async function getPlayerRank(
  key: string,
  userId: string,
): Promise<{ rank: number; xp: number } | null> {
  const [rank, score] = await Promise.all([redis.zrevrank(key, userId), redis.zscore(key, userId)]);
  if (rank === null || score === null) return null;
  return { rank: rank + 1, xp: Number(score) };
}

/**
 * Bulk-seed the leaderboard from PostgreSQL. Call once on worker startup
 * when the sorted set is empty (e.g. after Redis flush).
 * This is O(N log N) — only call when truly needed.
 */
export async function seedLeaderboardIfEmpty(
  profiles: Array<{ userId: string; xp: number }>,
): Promise<void> {
  const size = await redis.zcard(LEADERBOARD_GLOBAL);
  if (size > 0) return; // already seeded

  if (profiles.length === 0) return;

  // Build flat [score, member, ...] array for ZADD
  const args: Array<string | number> = [];
  for (const p of profiles) {
    args.push(p.xp, p.userId);
  }
  await redis.zadd(LEADERBOARD_GLOBAL, ...args);
}
