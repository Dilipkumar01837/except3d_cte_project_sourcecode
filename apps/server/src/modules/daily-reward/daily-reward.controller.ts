import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../shared/lib/response.js';
import { getDailyRewardStatus, claimDailyReward } from './daily-reward.service.js';

export async function getStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }
  const status = await getDailyRewardStatus(userId);
  sendSuccess(res, status);
}

export async function claimReward(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }
  const result = await claimDailyReward(userId);
  sendSuccess(res, result, 201);
}
