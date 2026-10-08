import { Router, type IRouter } from 'express';
import { authenticate, optionalAuthenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import {
  createSubmission,
  getChallenge,
  getHint,
  getAiHint,
  getAiErrorHint,
  getSubmission,
  getSubmissionStatus,
  listChallenges,
  listSubmissions,
  runCode,
  submitAiHintFeedback,
  submitHintFeedback,
} from './challenge.controller.js';
import { aiHintRateLimit, submissionRateLimit } from '../../shared/middleware/rate-limit.js';

export const challengeRouter: IRouter = Router();
challengeRouter.get('/', asyncHandler(listChallenges));
challengeRouter.get('/:slug', optionalAuthenticate, asyncHandler(getChallenge));
// Literal path segments (ai, ai-error, ai/:hintId/feedback) must be registered
// BEFORE parameterised routes (/:level, /:level/feedback) so that Express does
// not bind "ai" to the :level parameter and route to the wrong handler.
challengeRouter.post('/:slug/hints/ai', authenticate, aiHintRateLimit, asyncHandler(getAiHint));
challengeRouter.post(
  '/:slug/hints/ai-error',
  authenticate,
  aiHintRateLimit,
  asyncHandler(getAiErrorHint),
);
challengeRouter.post(
  '/:slug/hints/ai/:hintId/feedback',
  authenticate,
  asyncHandler(submitAiHintFeedback),
);
challengeRouter.get('/:slug/hints/:level', authenticate, asyncHandler(getHint));
challengeRouter.post(
  '/:slug/hints/:level/feedback',
  authenticate,
  asyncHandler(submitHintFeedback),
);
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
