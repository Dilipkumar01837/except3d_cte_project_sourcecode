import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../shared/lib/response.js';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { env } from '../../config/index.js';
import {
  getOverviewStats,
  listUsers,
  getUserById,
  updateUserRole,
  suspendUser,
  reactivateUser,
  listAdminChallenges,
  getAdminChallenge,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
  publishAdminChallenge,
  addTestCase,
  updateTestCase,
  deleteTestCase,
  addHint,
  updateHint,
  deleteHint,
  listAdminWorlds,
  createAdminWorld,
  updateAdminWorld,
  deleteAdminWorld,
  createAdminLevel,
  updateAdminLevel,
  deleteAdminLevel,
  listAdminRoomKeys,
  createAdminRoomKey,
  updateAdminRoomKey,
  deleteAdminRoomKey,
  listAdminRoomLocks,
  createAdminRoomLock,
  updateAdminRoomLock,
  deleteAdminRoomLock,
  listAdminAchievements,
  createAdminAchievement,
  updateAdminAchievement,
  toggleAchievementPublish,
} from './admin.service.js';
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

function adminId(req: Request): string {
  // req.user is guaranteed by authenticate middleware on all admin routes
  const sub = req.user?.sub;
  if (!sub) throw Object.assign(new Error('Not authenticated'), { statusCode: 401 });
  return sub;
}

/** The authenticated admin's own role, used for privilege-escalation guards. */
function actingRole(req: Request): UserRole {
  const role = req.user?.role;
  if (!role) throw Object.assign(new Error('Not authenticated'), { statusCode: 401 });
  return role;
}

function qNum(req: Request, key: string, def: number, max?: number): number {
  const val = Number(req.query[key]) || def;
  return max ? Math.min(val, max) : val;
}

function qStr(req: Request, key: string): string | undefined {
  const v = req.query[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function param(req: Request, key: string): string | undefined {
  const v = req.params[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

// ─── Overview ───────────────────────────────────────────────────

export async function getOverview(_req: Request, res: Response): Promise<void> {
  const stats = await getOverviewStats();
  sendSuccess(res, stats);
}

// ─── System Status ───────────────────────────────────────────────

export async function getSystemStatus(_req: Request, res: Response): Promise<void> {
  // DB health
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    /* ignore */
  }

  // Redis health
  let redisOk = false;
  let queueDepth = 0;
  try {
    await redis.ping();
    redisOk = true;
    queueDepth = await redis.llen('cte:execution:queue');
  } catch {
    /* ignore */
  }

  // Code runner health
  let runnerOk = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      ctrl.abort();
    }, 2_000);
    const r = await fetch(`${env.codeRunnerUrl}/health`, {
      headers: { Authorization: `Bearer ${env.codeRunnerToken}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    runnerOk = r.ok;
  } catch {
    /* ignore */
  }

  // DB counts
  const [
    userCount,
    challengeCount,
    submissionCount,
    recentSubmissionVolume,
    acceptedCount,
    queuedCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.submission.count(),
    prisma.submission.count({
      where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    }),
    prisma.submission.count({ where: { status: 'ACCEPTED' } }),
    prisma.submission.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
  ]);

  sendSuccess(res, {
    services: {
      database: { ok: dbOk, label: 'PostgreSQL' },
      redis: { ok: redisOk, label: 'Redis' },
      codeRunner: { ok: runnerOk, label: 'Code Runner' },
    },
    stats: {
      userCount,
      challengeCount,
      submissionCount,
      acceptedCount,
      successRate: submissionCount > 0 ? Math.round((acceptedCount / submissionCount) * 100) : 0,
      recentSubmissionVolume,
      queuedCount,
    },
    queue: { depth: queueDepth },
    env: {
      nodeEnv: env.nodeEnv,
      port: env.port,
      version: '0.1.0',
    },
    uptime: Math.round(process.uptime()),
  });
}

// ─── Users ──────────────────────────────────────────────────────

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const result = await listUsers(
    qNum(req, 'page', 1),
    qNum(req, 'limit', 20, 100),
    qStr(req, 'search'),
    qStr(req, 'role'),
  );
  sendSuccess(res, result);
}

export async function getUserHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing user id');
    return;
  }
  const result = await getUserById(id);
  if (!result) {
    sendError(res, 404, 'NOT_FOUND', 'User not found');
    return;
  }
  sendSuccess(res, result);
}

export async function updateUserRoleHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing user id');
    return;
  }
  const { role } = req.body as { role: UserRole };
  await updateUserRole(id, role, adminId(req), actingRole(req));
  sendSuccess(res, { message: 'Role updated' });
}

export async function suspendUserHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing user id');
    return;
  }
  const { reason } = req.body as { reason?: string };
  await suspendUser(id, reason, adminId(req), actingRole(req));
  sendSuccess(res, { message: 'User suspended' });
}

export async function reactivateUserHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing user id');
    return;
  }
  await reactivateUser(id, adminId(req), actingRole(req));
  sendSuccess(res, { message: 'User reactivated' });
}

// ─── Challenges ──────────────────────────────────────────────────

export async function listChallengesHandler(req: Request, res: Response): Promise<void> {
  const result = await listAdminChallenges(
    qNum(req, 'page', 1),
    qNum(req, 'limit', 20, 100),
    qStr(req, 'search'),
    qStr(req, 'difficulty'),
  );
  sendSuccess(res, result);
}

export async function getChallengeHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  const challenge = await getAdminChallenge(id);
  if (!challenge) {
    sendError(res, 404, 'NOT_FOUND', 'Challenge not found');
    return;
  }
  sendSuccess(res, { challenge });
}

export async function createChallengeHandler(req: Request, res: Response): Promise<void> {
  const challenge = await createAdminChallenge(req.body as CreateChallengeInput);
  sendSuccess(res, { challenge }, 201);
}

export async function updateChallengeHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  const challenge = await updateAdminChallenge(id, req.body as UpdateChallengeInput);
  sendSuccess(res, { challenge });
}

export async function deleteChallengeHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  await deleteAdminChallenge(id);
  sendSuccess(res, { message: 'Challenge deleted' });
}

export async function publishChallengeHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  await publishAdminChallenge(id, true, adminId(req));
  sendSuccess(res, { message: 'Challenge published' });
}

export async function unpublishChallengeHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  await publishAdminChallenge(id, false, adminId(req));
  sendSuccess(res, { message: 'Challenge unpublished' });
}

// ─── Test Cases ──────────────────────────────────────────────────

export async function addTestCaseHandler(req: Request, res: Response): Promise<void> {
  const challengeId = param(req, 'id');
  if (!challengeId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing challenge id');
    return;
  }
  const testCase = await addTestCase(challengeId, req.body as CreateTestCaseInput);
  sendSuccess(res, { testCase }, 201);
}

export async function updateTestCaseHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'tcId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing test case id');
    return;
  }
  const testCase = await updateTestCase(id, req.body as UpdateTestCaseInput);
  sendSuccess(res, { testCase });
}

export async function deleteTestCaseHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'tcId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing test case id');
    return;
  }
  await deleteTestCase(id);
  sendSuccess(res, { message: 'Test case deleted' });
}

// ─── Hints ───────────────────────────────────────────────────────

export async function addHintHandler(req: Request, res: Response): Promise<void> {
  const challengeId = param(req, 'id');
  if (!challengeId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing challenge id');
    return;
  }
  const hint = await addHint(challengeId, req.body as CreateHintInput);
  sendSuccess(res, { hint }, 201);
}

export async function updateHintHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'hintId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing hint id');
    return;
  }
  const hint = await updateHint(id, req.body as UpdateHintInput);
  sendSuccess(res, { hint });
}

export async function deleteHintHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'hintId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing hint id');
    return;
  }
  await deleteHint(id);
  sendSuccess(res, { message: 'Hint deleted' });
}

// ─── Worlds ──────────────────────────────────────────────────────

export async function listWorldsHandler(_req: Request, res: Response): Promise<void> {
  const worlds = await listAdminWorlds();
  sendSuccess(res, { worlds });
}

export async function createWorldHandler(req: Request, res: Response): Promise<void> {
  const world = await createAdminWorld(req.body as CreateWorldInput);
  sendSuccess(res, { world }, 201);
}

export async function updateWorldHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  const world = await updateAdminWorld(id, req.body as UpdateWorldInput);
  sendSuccess(res, { world });
}

export async function deleteWorldHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  await deleteAdminWorld(id);
  sendSuccess(res, { message: 'World deleted' });
}

export async function createLevelHandler(req: Request, res: Response): Promise<void> {
  const worldId = param(req, 'id');
  if (!worldId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing world id');
    return;
  }
  const level = await createAdminLevel(worldId, req.body as CreateLevelInput);
  sendSuccess(res, { level }, 201);
}

export async function updateLevelHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'levelId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing level id');
    return;
  }
  const level = await updateAdminLevel(id, req.body as UpdateLevelInput);
  sendSuccess(res, { level });
}

export async function deleteLevelHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'levelId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing level id');
    return;
  }
  await deleteAdminLevel(id);
  sendSuccess(res, { message: 'Level deleted' });
}

// ── Escape room keys and locks ─────────────────────────────────────────

export async function listRoomKeysHandler(req: Request, res: Response): Promise<void> {
  const worldId = param(req, 'id');
  if (!worldId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing world id');
    return;
  }
  sendSuccess(res, { keys: await listAdminRoomKeys(worldId) });
}

export async function createRoomKeyHandler(req: Request, res: Response): Promise<void> {
  const worldId = param(req, 'id');
  if (!worldId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing world id');
    return;
  }
  const key = await createAdminRoomKey(worldId, req.body as CreateRoomKeyInput);
  sendSuccess(res, { key }, 201);
}

export async function updateRoomKeyHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'keyId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing key id');
    return;
  }
  sendSuccess(res, { key: await updateAdminRoomKey(id, req.body as UpdateRoomKeyInput) });
}

export async function deleteRoomKeyHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'keyId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing key id');
    return;
  }
  await deleteAdminRoomKey(id);
  sendSuccess(res, { message: 'Key deleted' });
}

export async function listRoomLocksHandler(req: Request, res: Response): Promise<void> {
  const worldId = param(req, 'id');
  if (!worldId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing world id');
    return;
  }
  sendSuccess(res, { locks: await listAdminRoomLocks(worldId) });
}

export async function createRoomLockHandler(req: Request, res: Response): Promise<void> {
  const worldId = param(req, 'id');
  if (!worldId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing world id');
    return;
  }
  const lock = await createAdminRoomLock(worldId, req.body as CreateRoomLockInput);
  sendSuccess(res, { lock }, 201);
}

export async function updateRoomLockHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'lockId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing lock id');
    return;
  }
  sendSuccess(res, { lock: await updateAdminRoomLock(id, req.body as UpdateRoomLockInput) });
}

export async function deleteRoomLockHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'lockId');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing lock id');
    return;
  }
  await deleteAdminRoomLock(id);
  sendSuccess(res, { message: 'Lock deleted' });
}

// ─── Achievements ─────────────────────────────────────────────────

export async function listAchievementsHandler(_req: Request, res: Response): Promise<void> {
  const achievements = await listAdminAchievements();
  sendSuccess(res, { achievements });
}

export async function createAchievementHandler(req: Request, res: Response): Promise<void> {
  const achievement = await createAdminAchievement(req.body as CreateAchievementInput);
  sendSuccess(res, { achievement }, 201);
}

export async function updateAchievementHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  const achievement = await updateAdminAchievement(id, req.body as UpdateAchievementInput);
  sendSuccess(res, { achievement });
}

export async function publishAchievementHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  await toggleAchievementPublish(id, true, adminId(req));
  sendSuccess(res, { message: 'Achievement published' });
}

export async function unpublishAchievementHandler(req: Request, res: Response): Promise<void> {
  const id = param(req, 'id');
  if (!id) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Missing id');
    return;
  }
  await toggleAchievementPublish(id, false, adminId(req));
  sendSuccess(res, { message: 'Achievement unpublished' });
}

// ─── Audit Log ──────────────────────────────────────────────────

export async function getAuditLog(req: Request, res: Response): Promise<void> {
  const page = qNum(req, 'page', 1);
  const limit = qNum(req, 'limit', 50, 100);
  const [logs, total] = await prisma.$transaction([
    prisma.adminAuditLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.adminAuditLog.count(),
  ]);
  sendSuccess(res, { logs, total, page, limit });
}
