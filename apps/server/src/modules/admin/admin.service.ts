import { type UserRole } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { writeAudit } from '../../shared/lib/audit.js';
import { disconnectUserSockets } from '../../shared/lib/socket.js';
import type {
  CreateChallengeInput,
  UpdateChallengeInput,
  CreateTestCaseInput,
  UpdateTestCaseInput,
  CreateHintInput,
  UpdateHintInput,
  CreateWorldInput,
  UpdateWorldInput,
  CreateLevelInput,
  UpdateLevelInput,
  CreateRoomKeyInput,
  UpdateRoomKeyInput,
  CreateRoomLockInput,
  UpdateRoomLockInput,
  CreateAchievementInput,
  UpdateAchievementInput,
} from './admin.schema.js';

// ─────────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────────

export async function getOverviewStats() {
  const [
    totalUsers,
    activeUsers,
    totalChallenges,
    publishedChallenges,
    totalSubmissions,
    acceptedSubmissions,
    totalWorlds,
    publishedWorlds,
    totalLevels,
    totalAchievements,
    recentUsers,
    recentSubmissions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.challenge.count(),
    prisma.challenge.count({ where: { isPublished: true } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: 'ACCEPTED' } }),
    prisma.gameWorld.count(),
    prisma.gameWorld.count({ where: { isPublished: true } }),
    prisma.gameLevel.count(),
    prisma.achievement.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        isActive: true,
        profile: { select: { displayName: true, level: true, xp: true } },
      },
    }),
    prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { username: true } },
        challenge: { select: { title: true, slug: true } },
      },
    }),
  ]);

  const successRate =
    totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

  return {
    totalUsers,
    activeUsers,
    totalChallenges,
    publishedChallenges,
    totalSubmissions,
    acceptedSubmissions,
    successRate,
    totalWorlds,
    publishedWorlds,
    totalLevels,
    totalAchievements,
    recentUsers,
    recentSubmissions,
  };
}

// ─────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────

export async function listUsers(page: number, limit: number, search?: string, role?: string) {
  const where = {
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(['PLAYER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role ?? '')
      ? { role: role as UserRole }
      : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { profile: { select: { displayName: true, level: true, xp: true, rank: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      sessions: { where: { isActive: true }, take: 5, orderBy: { lastSeenAt: 'desc' } },
      loginHistory: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!user) return null;

  const [submissionCount, achievementCount] = await Promise.all([
    prisma.submission.count({ where: { userId: id } }),
    prisma.playerAchievement.count({ where: { userId: id, unlockedAt: { not: null } } }),
  ]);

  return { user, submissionCount, achievementCount };
}

export async function updateUserRole(
  id: string,
  role: UserRole,
  adminId: string,
  actingRole: UserRole,
): Promise<void> {
  // Only a SUPER_ADMIN may grant or revoke SUPER_ADMIN. Without this an ADMIN
  // could promote their own account and take full control of the platform.
  if (role === 'SUPER_ADMIN' && actingRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('Only a super admin can grant the super admin role'), {
      statusCode: 403,
    });
  }
  if (id === adminId && role !== actingRole) {
    throw Object.assign(new Error('You cannot change your own role'), { statusCode: 403 });
  }

  const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (before?.role === 'SUPER_ADMIN' && actingRole !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('Only a super admin can change a super admin'), {
      statusCode: 403,
    });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { role } }),
    // A role change must not be usable with an access token minted under the old
    // role, so existing refresh tokens are revoked and re-login is required.
    prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } }),
    prisma.playerNotification.create({
      data: {
        userId: id,
        type: 'SYSTEM',
        title: 'Account role updated',
        body: `Your account role has been changed to ${role}. Please sign in again.`,
        data: { adminId, action: 'ROLE_CHANGE', role },
      },
    }),
  ]);
  void writeAudit({
    adminId,
    action: 'USER_ROLE_UPDATED',
    targetType: 'User',
    targetId: id,
    before: before ?? undefined,
    after: { role },
  });
}

export async function suspendUser(
  id: string,
  reason: string | undefined,
  adminId: string,
  actingRole: UserRole,
): Promise<void> {
  if (id === adminId) {
    throw Object.assign(new Error('You cannot suspend your own account'), { statusCode: 403 });
  }
  await assertCanTarget(id, actingRole);

  // Live sockets are not covered by revoking refresh tokens: an already-connected
  // client would keep receiving this user's private events. Drop them now instead
  // of waiting for the access token to expire. Done before the transaction so the
  // disconnect is not held up by a database failure.
  disconnectUserSockets(id);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: false } }),
    prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } }),
    prisma.session.updateMany({ where: { userId: id, isActive: true }, data: { isActive: false } }),
    prisma.playerNotification.create({
      data: {
        userId: id,
        type: 'SYSTEM',
        title: 'Account suspended',
        body: reason ?? 'Your account has been suspended by an administrator.',
        data: { adminId, action: 'SUSPEND', reason },
      },
    }),
  ]);
  void writeAudit({
    adminId,
    action: 'USER_SUSPENDED',
    targetType: 'User',
    targetId: id,
    after: { reason: reason ?? null },
  });
}

export async function reactivateUser(
  id: string,
  adminId: string,
  actingRole: UserRole,
): Promise<void> {
  await assertCanTarget(id, actingRole);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: true } }),
    prisma.playerNotification.create({
      data: {
        userId: id,
        type: 'SYSTEM',
        title: 'Account reactivated',
        body: 'Your account has been reactivated.',
        data: { adminId, action: 'REACTIVATE' },
      },
    }),
  ]);
  void writeAudit({ adminId, action: 'USER_REACTIVATED', targetType: 'User', targetId: id });
}

/** Guards against an ADMIN acting on a SUPER_ADMIN account. */
async function assertCanTarget(id: string, actingRole: UserRole): Promise<void> {
  if (actingRole === 'SUPER_ADMIN') return;
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === 'SUPER_ADMIN') {
    throw Object.assign(new Error('Only a super admin can manage a super admin account'), {
      statusCode: 403,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// Challenges
// ─────────────────────────────────────────────────────────────────

export async function listAdminChallenges(
  page: number,
  limit: number,
  search?: string,
  difficulty?: string,
) {
  const where = {
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(['EASY', 'MEDIUM', 'HARD'].includes(difficulty ?? '')
      ? { difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD' }
      : {}),
  };

  const [challenges, total] = await prisma.$transaction([
    prisma.challenge.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { testCases: true, submissions: true } },
      },
    }),
    prisma.challenge.count({ where }),
  ]);

  return { challenges, total, page, limit };
}

export async function getAdminChallenge(id: string) {
  return prisma.challenge.findUnique({
    where: { id },
    include: {
      testCases: { orderBy: { sortOrder: 'asc' } },
      hints: { orderBy: { level: 'asc' } },
      solutions: true,
      _count: { select: { submissions: true } },
    },
  });
}

export async function createAdminChallenge(data: CreateChallengeInput) {
  return prisma.challenge.create({ data });
}

export async function updateAdminChallenge(id: string, data: UpdateChallengeInput) {
  return prisma.challenge.update({ where: { id }, data });
}

export async function deleteAdminChallenge(id: string): Promise<void> {
  const submissionCount = await prisma.submission.count({ where: { challengeId: id } });
  if (submissionCount > 0) {
    // Soft delete — archive
    await prisma.challenge.update({
      where: { id },
      data: {
        isPublished: false,
        title: `[ARCHIVED] ${(await prisma.challenge.findUnique({ where: { id }, select: { title: true } }))?.title ?? ''}`,
      },
    });
  } else {
    await prisma.challenge.delete({ where: { id } });
  }
}

export async function publishAdminChallenge(
  id: string,
  publish: boolean,
  adminId?: string,
): Promise<void> {
  await prisma.challenge.update({ where: { id }, data: { isPublished: publish } });
  if (adminId) {
    void writeAudit({
      adminId,
      action: publish ? 'CHALLENGE_PUBLISHED' : 'CHALLENGE_UNPUBLISHED',
      targetType: 'Challenge',
      targetId: id,
    });
  }
}

export async function addTestCase(challengeId: string, data: CreateTestCaseInput) {
  return prisma.challengeTestCase.create({ data: { challengeId, ...data } });
}

export async function updateTestCase(id: string, data: UpdateTestCaseInput) {
  return prisma.challengeTestCase.update({ where: { id }, data });
}

export async function deleteTestCase(id: string): Promise<void> {
  await prisma.challengeTestCase.delete({ where: { id } });
}

export async function addHint(challengeId: string, data: CreateHintInput) {
  return prisma.challengeHint.create({ data: { challengeId, ...data } });
}

export async function updateHint(id: string, data: UpdateHintInput) {
  return prisma.challengeHint.update({ where: { id }, data });
}

export async function deleteHint(id: string): Promise<void> {
  await prisma.challengeHint.delete({ where: { id } });
}

// ─────────────────────────────────────────────────────────────────
// Worlds & Levels
// ─────────────────────────────────────────────────────────────────

export async function listAdminWorlds() {
  return prisma.gameWorld.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { levels: true } },
      levels: { orderBy: { number: 'asc' } },
    },
  });
}

export async function createAdminWorld(data: CreateWorldInput) {
  return prisma.gameWorld.create({ data });
}

export async function updateAdminWorld(id: string, data: UpdateWorldInput) {
  return prisma.gameWorld.update({ where: { id }, data });
}

export async function deleteAdminWorld(id: string): Promise<void> {
  const progressCount = await prisma.playerWorldProgress.count({ where: { worldId: id } });
  if (progressCount > 0) {
    throw Object.assign(new Error('Cannot delete world with player progress'), { statusCode: 409 });
  }
  await prisma.gameWorld.delete({ where: { id } });
}

export async function createAdminLevel(worldId: string, data: CreateLevelInput) {
  return prisma.gameLevel.create({ data: { worldId, ...data } });
}

export async function updateAdminLevel(id: string, data: UpdateLevelInput) {
  return prisma.gameLevel.update({ where: { id }, data });
}

export async function deleteAdminLevel(id: string): Promise<void> {
  await prisma.gameLevel.delete({ where: { id } });
}

// Escape room keys and locks
// ─────────────────────────────────────────────────────────────────

/**
 * Rejects a key or lock whose level and key belong to different worlds. The
 * schema cannot express this (it stores two independent ids), and getting it
 * wrong produces a lock that can never be opened and a key awarded for a level
 * the player may never reach, so it is checked explicitly.
 */
async function assertSameWorld(levelId: string, keyId: string, context: string): Promise<void> {
  const [level, key] = await Promise.all([
    prisma.gameLevel.findUnique({ where: { id: levelId }, select: { worldId: true } }),
    prisma.roomKey.findUnique({ where: { id: keyId }, select: { worldId: true } }),
  ]);
  if (!level) {
    throw Object.assign(new Error(`${context}: level not found`), { statusCode: 404 });
  }
  if (!key) {
    throw Object.assign(new Error(`${context}: key not found`), { statusCode: 404 });
  }
  if (level.worldId !== key.worldId) {
    throw Object.assign(new Error(`${context}: the level and the key are in different worlds`), {
      statusCode: 400,
    });
  }
}

export async function listAdminRoomKeys(worldId: string) {
  return prisma.roomKey.findMany({
    where: { worldId },
    orderBy: { slug: 'asc' },
    include: {
      grantedByLevel: { select: { id: true, number: true, title: true } },
      _count: { select: { holders: true, unlocks: true } },
    },
  });
}

export async function createAdminRoomKey(worldId: string, data: CreateRoomKeyInput) {
  const level = await prisma.gameLevel.findUnique({
    where: { id: data.grantedByLevelId },
    select: { worldId: true },
  });
  if (!level) {
    throw Object.assign(new Error('Cannot create key: level not found'), { statusCode: 404 });
  }
  if (level.worldId !== worldId) {
    throw Object.assign(
      new Error('Cannot create key: the granting level is in a different world'),
      { statusCode: 400 },
    );
  }
  return prisma.roomKey.create({ data: { worldId, ...data } });
}

export async function updateAdminRoomKey(id: string, data: UpdateRoomKeyInput) {
  if (data.grantedByLevelId) {
    // The key is identified by the row being updated, so compare that row's
    // world against the new granting level's world.
    await assertSameWorld(data.grantedByLevelId, id, 'Cannot update key');
  }
  return prisma.roomKey.update({ where: { id }, data });
}

export async function deleteAdminRoomKey(id: string): Promise<void> {
  // Keys cascade to holders and null out on locks, so deleting one cannot leave
  // a dangling reference. Players simply lose the shortcut.
  await prisma.roomKey.delete({ where: { id } });
}

export async function listAdminRoomLocks(worldId: string) {
  return prisma.roomLock.findMany({
    where: { worldId },
    orderBy: { createdAt: 'asc' },
    include: {
      level: { select: { id: true, number: true, title: true } },
      requiresKey: { select: { id: true, slug: true, title: true } },
    },
  });
}

export async function createAdminRoomLock(worldId: string, data: CreateRoomLockInput) {
  await assertSameWorld(data.levelId, data.requiresKeyId, 'Cannot create lock');
  const existing = await prisma.roomLock.findUnique({
    where: { levelId: data.levelId },
    select: { id: true },
  });
  if (existing) {
    throw Object.assign(
      new Error('Cannot create lock: this level already has one. Update it instead.'),
      { statusCode: 409 },
    );
  }
  return prisma.roomLock.create({ data: { worldId, ...data } });
}

export async function updateAdminRoomLock(id: string, data: UpdateRoomLockInput) {
  if (data.requiresKeyId) {
    const lock = await prisma.roomLock.findUnique({
      where: { id },
      select: { levelId: true },
    });
    if (!lock) {
      throw Object.assign(new Error('Cannot update lock: lock not found'), { statusCode: 404 });
    }
    await assertSameWorld(lock.levelId, data.requiresKeyId, 'Cannot update lock');
  }
  return prisma.roomLock.update({ where: { id }, data });
}

export async function deleteAdminRoomLock(id: string): Promise<void> {
  await prisma.roomLock.delete({ where: { id } });
}

// ─────────────────────────────────────────────────────────────────
// Achievements
// ─────────────────────────────────────────────────────────────────

export async function listAdminAchievements() {
  return prisma.achievement.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { players: true } } },
  });
}

export async function createAdminAchievement(data: CreateAchievementInput) {
  return prisma.achievement.create({ data });
}

export async function updateAdminAchievement(id: string, data: UpdateAchievementInput) {
  return prisma.achievement.update({ where: { id }, data });
}

export async function toggleAchievementPublish(
  id: string,
  published: boolean,
  adminId?: string,
): Promise<void> {
  await prisma.achievement.update({ where: { id }, data: { isPublished: published } });
  if (adminId) {
    void writeAudit({
      adminId,
      action: published ? 'ACHIEVEMENT_PUBLISHED' : 'ACHIEVEMENT_UNPUBLISHED',
      targetType: 'Achievement',
      targetId: id,
    });
  }
}
