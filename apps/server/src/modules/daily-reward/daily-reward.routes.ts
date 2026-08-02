import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { getStatus, claimReward } from './daily-reward.controller.js';

export const dailyRewardRouter: IRouter = Router();

dailyRewardRouter.use(authenticate);
dailyRewardRouter.get('/', asyncHandler(getStatus));
dailyRewardRouter.post('/claim', asyncHandler(claimReward));
