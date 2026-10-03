import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import {
  getDashboard,
  listAchievements,
  listInventory,
  listLevels,
  listNotifications,
  listWorlds,
  markNotificationRead,
  getLeaderboard,
  recordRoomDiscovery,
} from './player.controller.js';

/** Authenticated player-state API. */
export const playerRouter: IRouter = Router();

playerRouter.use(authenticate);
playerRouter.get('/dashboard', asyncHandler(getDashboard));
playerRouter.get('/worlds', asyncHandler(listWorlds));
playerRouter.get('/worlds/:worldId/levels', asyncHandler(listLevels));
playerRouter.post('/levels/:levelId/discovery', asyncHandler(recordRoomDiscovery));
playerRouter.get('/achievements', asyncHandler(listAchievements));
playerRouter.get('/inventory', asyncHandler(listInventory));
playerRouter.get('/notifications', asyncHandler(listNotifications));
playerRouter.patch('/notifications/:notificationId/read', asyncHandler(markNotificationRead));
playerRouter.get('/leaderboard', asyncHandler(getLeaderboard));
