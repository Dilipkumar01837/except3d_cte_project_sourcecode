import { redis } from '../../shared/lib/redis.js';
import { prisma } from '../../shared/lib/prisma.js';
import { createDuel, joinDuel } from '../duels/duel.service.js';
import { emitToUser } from '../../shared/lib/socket.js';
import { notifyUser } from '../notifications/push.service.js';

const queue = 'cte:social:matchmaking:ranked';
const member = (userId: string, challengeId: string) => `${userId}:${challengeId}`;
export async function enqueueMatch(userId: string, challengeId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { xp: true } });
  const rating = (profile?.xp ?? 0) + 1000;
  await redis.zadd(queue, rating, member(userId, challengeId));
  const candidates = await redis.zrangebyscore(queue, rating - 500, rating + 500, 'LIMIT', 0, 20);
  const match = candidates.find(
    (candidate) =>
      candidate.split(':')[0] !== userId && candidate.split(':').slice(1).join(':') === challengeId,
  );
  if (!match) return { status: 'QUEUED' as const };
  const opponentId = match.split(':')[0];
  if (!opponentId) return { status: 'QUEUED' as const };
  await redis.zrem(queue, member(userId, challengeId), match);
  const duel = await createDuel(userId, challengeId);
  if (!duel) return { status: 'QUEUED' as const };
  const joined = await joinDuel(opponentId, duel.id);
  if (!joined) return { status: 'QUEUED' as const };
  emitToUser(userId, 'social:match-found', { duelId: joined.id, opponentId });
  emitToUser(opponentId, 'social:match-found', { duelId: joined.id, opponentId: userId });
  await notifyUser(userId, {
    type: 'MATCH_FOUND',
    title: 'Match found',
    body: 'Your ranked duel is ready.',
    data: { url: `/duels/${joined.id}` },
  });
  await notifyUser(opponentId, {
    type: 'MATCH_FOUND',
    title: 'Match found',
    body: 'Your ranked duel is ready.',
    data: { url: `/duels/${joined.id}` },
  });
  return { status: 'MATCHED' as const, duelId: joined.id };
}
export async function cancelMatch(userId: string) {
  const removed = await redis.zremrangebylex(queue, `[${userId}:`, `(${userId};`);
  return removed;
}
