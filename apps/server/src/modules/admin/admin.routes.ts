import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { validate } from '../../shared/middleware/validate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import {
  updateUserRoleSchema,
  suspendUserSchema,
  createChallengeSchema,
  updateChallengeSchema,
  createTestCaseSchema,
  updateTestCaseSchema,
  createHintSchema,
  updateHintSchema,
  createWorldSchema,
  updateWorldSchema,
  createLevelSchema,
  createRoomKeySchema,
  updateRoomKeySchema,
  createRoomLockSchema,
  updateRoomLockSchema,
  updateLevelSchema,
  createAchievementSchema,
  updateAchievementSchema,
} from './admin.schema.js';
import {
  getOverview,
  getSystemStatus as getSystemStatusHandler,
  getAuditLog,
  listUsersHandler,
  getUserHandler,
  updateUserRoleHandler,
  suspendUserHandler,
  reactivateUserHandler,
  listChallengesHandler,
  getChallengeHandler,
  createChallengeHandler,
  updateChallengeHandler,
  deleteChallengeHandler,
  publishChallengeHandler,
  unpublishChallengeHandler,
  addTestCaseHandler,
  updateTestCaseHandler,
  deleteTestCaseHandler,
  addHintHandler,
  updateHintHandler,
  deleteHintHandler,
  listWorldsHandler,
  createWorldHandler,
  updateWorldHandler,
  deleteWorldHandler,
  createLevelHandler,
  updateLevelHandler,
  deleteLevelHandler,
  listRoomKeysHandler,
  createRoomKeyHandler,
  updateRoomKeyHandler,
  deleteRoomKeyHandler,
  listRoomLocksHandler,
  createRoomLockHandler,
  updateRoomLockHandler,
  deleteRoomLockHandler,
  listAchievementsHandler,
  createAchievementHandler,
  updateAchievementHandler,
  publishAchievementHandler,
  unpublishAchievementHandler,
  getHintAnalyticsHandler,
} from './admin.controller.js';
import { getTelemetrySummaryHandler } from '../telemetry/telemetry.controller.js';

export const adminRouter: IRouter = Router();

// All admin routes require authentication and ADMIN or SUPER_ADMIN role
adminRouter.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

// Overview
adminRouter.get('/overview', asyncHandler(getOverview));
adminRouter.get('/system', asyncHandler(getSystemStatusHandler));
adminRouter.get('/audit', asyncHandler(getAuditLog));
adminRouter.get('/hints/analytics', asyncHandler(getHintAnalyticsHandler));

// Users
adminRouter.get('/users', asyncHandler(listUsersHandler));
adminRouter.get('/users/:id', asyncHandler(getUserHandler));
adminRouter.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  asyncHandler(updateUserRoleHandler),
);
adminRouter.post(
  '/users/:id/suspend',
  validate(suspendUserSchema),
  asyncHandler(suspendUserHandler),
);
adminRouter.post('/users/:id/reactivate', asyncHandler(reactivateUserHandler));

// Challenges
adminRouter.get('/challenges', asyncHandler(listChallengesHandler));
adminRouter.post(
  '/challenges',
  validate(createChallengeSchema),
  asyncHandler(createChallengeHandler),
);
adminRouter.get('/challenges/:id', asyncHandler(getChallengeHandler));
adminRouter.patch(
  '/challenges/:id',
  validate(updateChallengeSchema),
  asyncHandler(updateChallengeHandler),
);
adminRouter.delete('/challenges/:id', asyncHandler(deleteChallengeHandler));
adminRouter.post('/challenges/:id/publish', asyncHandler(publishChallengeHandler));
adminRouter.post('/challenges/:id/unpublish', asyncHandler(unpublishChallengeHandler));
adminRouter.post(
  '/challenges/:id/test-cases',
  validate(createTestCaseSchema),
  asyncHandler(addTestCaseHandler),
);
adminRouter.patch(
  '/challenges/:id/test-cases/:tcId',
  validate(updateTestCaseSchema),
  asyncHandler(updateTestCaseHandler),
);
adminRouter.delete('/challenges/:id/test-cases/:tcId', asyncHandler(deleteTestCaseHandler));
adminRouter.post('/challenges/:id/hints', validate(createHintSchema), asyncHandler(addHintHandler));
adminRouter.patch(
  '/challenges/:id/hints/:hintId',
  validate(updateHintSchema),
  asyncHandler(updateHintHandler),
);
adminRouter.delete('/challenges/:id/hints/:hintId', asyncHandler(deleteHintHandler));

// Worlds
adminRouter.get('/worlds', asyncHandler(listWorldsHandler));
adminRouter.post('/worlds', validate(createWorldSchema), asyncHandler(createWorldHandler));
adminRouter.patch('/worlds/:id', validate(updateWorldSchema), asyncHandler(updateWorldHandler));
adminRouter.delete('/worlds/:id', asyncHandler(deleteWorldHandler));
adminRouter.post(
  '/worlds/:id/levels',
  validate(createLevelSchema),
  asyncHandler(createLevelHandler),
);
adminRouter.patch(
  '/worlds/:id/levels/:levelId',
  validate(updateLevelSchema),
  asyncHandler(updateLevelHandler),
);
adminRouter.delete('/worlds/:id/levels/:levelId', asyncHandler(deleteLevelHandler));

// Escape room keys and locks
adminRouter.get('/worlds/:id/keys', asyncHandler(listRoomKeysHandler));
adminRouter.post(
  '/worlds/:id/keys',
  validate(createRoomKeySchema),
  asyncHandler(createRoomKeyHandler),
);
adminRouter.patch(
  '/worlds/:id/keys/:keyId',
  validate(updateRoomKeySchema),
  asyncHandler(updateRoomKeyHandler),
);
adminRouter.delete('/worlds/:id/keys/:keyId', asyncHandler(deleteRoomKeyHandler));
adminRouter.get('/worlds/:id/locks', asyncHandler(listRoomLocksHandler));
adminRouter.post(
  '/worlds/:id/locks',
  validate(createRoomLockSchema),
  asyncHandler(createRoomLockHandler),
);
adminRouter.patch(
  '/worlds/:id/locks/:lockId',
  validate(updateRoomLockSchema),
  asyncHandler(updateRoomLockHandler),
);
adminRouter.delete('/worlds/:id/locks/:lockId', asyncHandler(deleteRoomLockHandler));

// Achievements
adminRouter.get('/achievements', asyncHandler(listAchievementsHandler));
adminRouter.post(
  '/achievements',
  validate(createAchievementSchema),
  asyncHandler(createAchievementHandler),
);
adminRouter.patch(
  '/achievements/:id',
  validate(updateAchievementSchema),
  asyncHandler(updateAchievementHandler),
);
adminRouter.post('/achievements/:id/publish', asyncHandler(publishAchievementHandler));
adminRouter.post('/achievements/:id/unpublish', asyncHandler(unpublishAchievementHandler));

// Telemetry (aggregate, engagement-only; no per-user drill-down)
adminRouter.get('/telemetry/summary', asyncHandler(getTelemetrySummaryHandler));
