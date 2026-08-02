import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import {
  createSubmission,
  getChallenge,
  getHint,
  getSubmission,
  getSubmissionStatus,
  listChallenges,
  listSubmissions,
} from './challenge.controller.js';
import { submissionRateLimit } from '../../shared/middleware/rate-limit.js';

export const challengeRouter: IRouter = Router();
challengeRouter.get('/', asyncHandler(listChallenges));
challengeRouter.get('/:slug', asyncHandler(getChallenge));
challengeRouter.get('/:slug/hints/:level', authenticate, asyncHandler(getHint));
challengeRouter.get('/:slug/submissions', authenticate, asyncHandler(listSubmissions));
challengeRouter.get(
  '/:slug/submissions/:submissionId/status',
  authenticate,
  asyncHandler(getSubmissionStatus),
);
challengeRouter.get('/:slug/submissions/:submissionId', authenticate, asyncHandler(getSubmission));
challengeRouter.post(
  '/:slug/submissions',
  authenticate,
  submissionRateLimit,
  asyncHandler(createSubmission),
);
