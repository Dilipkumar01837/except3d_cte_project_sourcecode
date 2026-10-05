import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import * as social from './social.service.js';
import { cancelMatch, enqueueMatch } from './matchmaking.service.js';

const id = (req: { params: Record<string, string | string[] | undefined> }, key: string) =>
  typeof req.params[key] === 'string' ? req.params[key] : '';
const current = (req: { user?: { sub?: string } }, res: Parameters<typeof sendError>[0]) => {
  const value = req.user?.sub;
  if (!value) sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
  return value;
};
export const socialRouter: IRouter = Router();
socialRouter.use(authenticate);
socialRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (!userId) return;
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    if (q.length < 2) {
      sendError(res, 422, 'VALIDATION_ERROR', 'Search requires two characters');
      return;
    }
    sendSuccess(res, { users: await social.searchUsers(userId, q) });
  }),
);
socialRouter.get(
  '/friends',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { friends: await social.listFriends(userId) });
  }),
);
socialRouter.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { requests: await social.listRequests(userId) });
  }),
);
socialRouter.post(
  '/requests/:userId',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (!userId) return;
    const result = await social.sendRequest(userId, id(req, 'userId'));
    if (!result) {
      sendError(res, 409, 'SOCIAL_UNAVAILABLE', 'Request cannot be sent');
      return;
    }
    sendSuccess(res, { request: result }, 201);
  }),
);
socialRouter.post(
  '/requests/:requestId/accept',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId)
      sendSuccess(res, {
        request: await social.respondRequest(userId, id(req, 'requestId'), true),
      });
  }),
);
socialRouter.post(
  '/requests/:requestId/reject',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId)
      sendSuccess(res, {
        request: await social.respondRequest(userId, id(req, 'requestId'), false),
      });
  }),
);
socialRouter.delete(
  '/friends/:userId',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { removed: await social.removeFriend(userId, id(req, 'userId')) });
  }),
);
socialRouter.get(
  '/blocks',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { blocks: await social.listBlocks(userId) });
  }),
);
socialRouter.post(
  '/blocks/:userId',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { blocked: await social.blockUser(userId, id(req, 'userId')) });
  }),
);
socialRouter.delete(
  '/blocks/:userId',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) {
      await social.unblockUser(userId, id(req, 'userId'));
      sendSuccess(res, { unblocked: true });
    }
  }),
);
socialRouter.get(
  '/messages/:userId',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId)
      sendSuccess(res, {
        messages: await social.listMessages(
          userId,
          id(req, 'userId'),
          typeof req.query['cursor'] === 'string' ? req.query['cursor'] : undefined,
        ),
      });
  }),
);
socialRouter.post(
  '/messages/:userId/read',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) {
      await social.markMessagesRead(userId, id(req, 'userId'));
      sendSuccess(res, { read: true });
    }
  }),
);
socialRouter.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { leaderboard: await social.friendLeaderboard(userId) });
  }),
);
socialRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { activity: await social.activityFeed(userId) });
  }),
);
socialRouter.get(
  '/profiles/:username',
  asyncHandler(async (req, res) => {
    const profile = await social.getPublicProfile(id(req, 'username'));
    if (!profile) {
      sendError(res, 404, 'NOT_FOUND', 'Profile not found');
      return;
    }
    sendSuccess(res, { profile });
  }),
);
socialRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { notifications: await social.listNotifications(userId) });
  }),
);
socialRouter.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) {
      await social.markNotification(userId, id(req, 'id'));
      sendSuccess(res, { read: true });
    }
  }),
);
socialRouter.post(
  '/matchmaking',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    const body = req.body as { challengeId?: unknown };
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
    if (!userId || !challengeId) {
      sendError(res, 422, 'VALIDATION_ERROR', 'challengeId is required');
      return;
    }
    sendSuccess(res, await enqueueMatch(userId, challengeId), 202);
  }),
);
socialRouter.delete(
  '/matchmaking',
  asyncHandler(async (req, res) => {
    const userId = current(req, res);
    if (userId) sendSuccess(res, { removed: await cancelMatch(userId) });
  }),
);
