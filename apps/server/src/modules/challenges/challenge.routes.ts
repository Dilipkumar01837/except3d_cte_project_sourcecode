import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import {
  createSubmission,
  getChallenge,
  getHint,
  getAiHint,
  getSubmission,
  getSubmissionStatus,
  listChallenges,
  listSubmissions,
  runCode,
} from './challenge.controller.js';
import { aiHintRateLimit, submissionRateLimit } from '../../shared/middleware/rate-limit.js';

export const challengeRouter: IRouter = Router();
challengeRouter.get('/', asyncHandler(listChallenges));
challengeRouter.get('/:slug', asyncHandler(getChallenge));
challengeRouter.get('/:slug/hints/:level', authenticate, asyncHandler(getHint));
challengeRouter.post('/:slug/hints/ai', authenticate, aiHintRateLimit, asyncHandler(getAiHint));
challengeRouter.get('/:slug/submissions', authenticate, asyncHandler(listSubmissions));
challengeRouter.get(
  '/:slug/submissions/:submissionId/status',
  authenticate,
  asyncHandler(getSubmissionStatus),
);
challengeRouter.get('/:slug/submissions/:submissionId', authenticate, asyncHandler(getSubmission));
challengeRouter.post('/:slug/runs', authenticate, submissionRateLimit, asyncHandler(runCode));
challengeRouter.post(
  '/:slug/submissions',
  authenticate,
  submissionRateLimit,
  asyncHandler(createSubmission),
);
