import type { Request, Response } from 'express';
import { prisma } from '../../shared/lib/prisma.js';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import {
  getTopPlayers,
  getPlayerRank,
  LEADERBOARD_GLOBAL,
  LEADERBOARD_WEEKLY,
} from '../../shared/lib/leaderboard.js';
import { reachablePercent, resolveLevelAccess, type LevelState } from '../worlds/escape-room.js';

function userId(req: Request, res: Response): string | undefined {
  const id = req.user?.sub;
  if (!id) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return id;
}

function routeParam(req: Request, res: Response, key: string): string | undefined {
  const value = req.params[key];
  if (typeof value !== 'string' || value.length === 0)
    sendError(res, 400, 'VALIDATION_ERROR', `Missing ${key}`);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Returns the player summary used by the authenticated game shell. */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;

  const [user, achievementCount, completedLevels, unlockedWorlds, recentActivity] =
    await Promise.all([
      prisma.user.findUnique({ where: { id }, include: { profile: true } }),
      prisma.playerAchievement.count({ where: { userId: id, unlockedAt: { not: null } } }),
      prisma.playerLevelProgress.count({ where: { userId: id, isCompleted: true } }),
      prisma.playerWorldProgress.count({ where: { userId: id, isUnlocked: true } }),
      prisma.playerNotification.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
  if (!user) {
    sendError(res, 404, 'NOT_FOUND', 'Player not found');
    return;
  }
  const safeUser = { ...user };
  delete (safeUser as { passwordHash?: string }).passwordHash;
  delete (safeUser as { emailVerifyToken?: string | null }).emailVerifyToken;
  delete (safeUser as { resetPasswordToken?: string | null }).resetPasswordToken;
  delete (safeUser as { resetPasswordExpiry?: Date | null }).resetPasswordExpiry;
  sendSuccess(res, {
    user: safeUser,
    summary: { achievementCount, completedLevels, unlockedWorlds },
    recentActivity,
  });
}

/** Lists published worlds with the requesting player's unlock and completion state. */
export async function listWorlds(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const worlds = await prisma.gameWorld.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      progress: { where: { userId: id } },
      _count: { select: { levels: { where: { isPublished: true } } } },
    },
  });
  sendSuccess(res, { worlds });
}

/** Lists a world's published levels with the caller's individual progress. */
export async function listLevels(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  const worldId = routeParam(req, res, 'worldId');
  if (!id || !worldId) return;
  const world = await prisma.gameWorld.findFirst({
    where: { id: worldId, isPublished: true },
    include: {
      levels: {
        where: { isPublished: true },
        orderBy: { number: 'asc' },
        include: {
          progress: { where: { userId: id } },
          challenge: { select: { slug: true, title: true } },
          guardedByRoomLock: {
            include: { requiresKey: { select: { slug: true, title: true } } },
          },
        },
      },
      roomKeys: {
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          title: true,
          artKey: true,
          holders: { where: { userId: id } },
        },
      },
    },
  });
  if (!world) {
    sendError(res, 404, 'NOT_FOUND', 'World not found');
    return;
  }

  // Locks are a published presentation concern: an unpublished lock should not
  // gate a level for players.
  const levels = world.levels.map((level) => {
    const lock = level.guardedByRoomLock;
    const publishedLock = lock && lock.isPublished ? lock : null;
    return {
      ...level,
      guardedByRoomLock: publishedLock,
      progress: level.progress,
      isCompleted: level.progress.some((entry) => entry.isCompleted),
    };
  });

  const heldKeyIds = new Set(
    world.roomKeys.filter((key) => key.holders.length > 0).map((key) => key.id),
  );

  const levelStates: LevelState[] = levels.map((level) => ({
    id: level.id,
    number: level.number,
    isCompleted: level.isCompleted,
    lock: level.guardedByRoomLock
      ? {
          title: level.guardedByRoomLock.title,
          prompt: level.guardedByRoomLock.prompt,
          requiresKeyId: level.guardedByRoomLock.requiresKeyId,
          requiresKeySlug: level.guardedByRoomLock.requiresKey?.slug ?? null,
          requiresKeyTitle: level.guardedByRoomLock.requiresKey?.title ?? null,
        }
      : null,
  }));
  const access = resolveLevelAccess(levelStates, heldKeyIds);

  const payload = levels.map((level) => {
    const resolution = access.get(level.id);
    return {
      ...level,
      access: resolution?.access ?? 'OPEN',
      missingKeySlug: resolution?.missingKeySlug ?? null,
    };
  });

  sendSuccess(res, {
    world: {
      ...world,
      levels: payload,
      roomKeys: world.roomKeys.map((key) => ({
        id: key.id,
        slug: key.slug,
        title: key.title,
        artKey: key.artKey,
        isHeld: key.holders.length > 0,
      })),
      reachablePercent: reachablePercent(access),
    },
  });
}

export async function listAchievements(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const achievements = await prisma.achievement.findMany({
    where: { isPublished: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: { players: { where: { userId: id } } },
  });
  sendSuccess(res, { achievements });
}

export async function listInventory(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const inventory = await prisma.playerInventory.findMany({
    where: { userId: id },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
  });
  sendSuccess(res, { inventory });
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;
  const notifications = await prisma.playerNotification.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  sendSuccess(res, { notifications });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  const notificationId = routeParam(req, res, 'notificationId');
  if (!id || !notificationId) return;
  const result = await prisma.playerNotification.updateMany({
    where: { id: notificationId, userId: id },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    sendError(res, 404, 'NOT_FOUND', 'Notification not found');
    return;
  }
  sendSuccess(res, { message: 'Notification marked as read' });
}

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  const id = userId(req, res);
  if (!id) return;

  const type = req.query['type'] === 'weekly' ? LEADERBOARD_WEEKLY : LEADERBOARD_GLOBAL;
  const count = Math.min(Number(req.query['limit']) || 50, 100);

  let top: Array<{ userId: string; xp: number; rank: number }> = [];
  let myRank: { rank: number; xp: number } | null = null;

  try {
    [top, myRank] = await Promise.all([getTopPlayers(type, count), getPlayerRank(type, id)]);
  } catch {
    // Redis unavailable — fall back to empty leaderboard rather than 500
    sendSuccess(res, {
      leaderboard: [],
      myRank: null,
      type: type === LEADERBOARD_WEEKLY ? 'weekly' : 'global',
    });
    return;
  }

  // Enrich with usernames — fetch only the IDs present in leaderboard
  const userIds = top.map((entry) => entry.userId);
  const profiles =
    userIds.length > 0
      ? await prisma.profile.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, displayName: true },
          take: count,
        })
      : [];
  const nameMap = new Map(profiles.map((p) => [p.userId, p.displayName]));

  const enriched = top.map((entry) => ({
    ...entry,
    displayName: nameMap.get(entry.userId) ?? 'Unknown',
  }));

  sendSuccess(res, {
    leaderboard: enriched,
    myRank,
    type: type === LEADERBOARD_WEEKLY ? 'weekly' : 'global',
  });
}
