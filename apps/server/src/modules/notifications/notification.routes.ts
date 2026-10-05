import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import { notifyUser, registerToken, unregisterToken } from './push.service.js';

const tokenSchema = z.object({
  token: z.string().min(20).max(4096),
  deviceInfo: z.string().max(200).optional(),
});
const current = (req: { user?: { sub?: string } }, res: Parameters<typeof sendError>[0]) => {
  const id = req.user?.sub;
  if (!id) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return id;
};
export const notificationRouter: IRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.post(
  '/register-token',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (!userId) return;
    const input = tokenSchema.parse(req.body);
    sendSuccess(res, { token: await registerToken(userId, input.token, input.deviceInfo) }, 201);
  }),
);
notificationRouter.delete(
  '/unregister-token',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (!userId) return;
    const body = req.body as { token?: unknown };
    const token = typeof body.token === 'string' ? body.token : undefined;
    await unregisterToken(userId, token);
    sendSuccess(res, { removed: true });
  }),
);
notificationRouter.post(
  '/send',
  authorize('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        userId: z.string().uuid(),
        type: z.string().max(50),
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(500),
        data: z.record(z.string()).optional(),
      })
      .parse(req.body);
    sendSuccess(res, { delivery: await notifyUser(input.userId, input) }, 202);
  }),
);
