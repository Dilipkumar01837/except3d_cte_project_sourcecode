import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { aiHintRateLimit } from '../../shared/middleware/rate-limit.js';
import {
  getHintHistory,
  getHintPreferences,
  rateHint,
  requestHint,
  updateHintPreferences,
} from './hints.controller.js';

export const hintsRouter: IRouter = Router();
hintsRouter.use(authenticate);
hintsRouter.post('/request', aiHintRateLimit, asyncHandler(requestHint));
hintsRouter.post('/:id/rate', asyncHandler(rateHint));
hintsRouter.get('/history', asyncHandler(getHintHistory));
hintsRouter.get('/preferences', asyncHandler(getHintPreferences));
hintsRouter.patch('/preferences', asyncHandler(updateHintPreferences));
