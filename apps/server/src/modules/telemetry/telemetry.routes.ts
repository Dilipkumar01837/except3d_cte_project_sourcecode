import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validate } from '../../shared/middleware/validate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { telemetryRateLimit } from '../../shared/middleware/rate-limit.js';
import {
  getConsentHandler,
  recordEventsHandler,
  setConsentHandler,
} from './telemetry.controller.js';
import { recordEventsSchema, setConsentSchema } from './telemetry.schema.js';

/** Authenticated, consent-gated telemetry API. */
export const telemetryRouter: IRouter = Router();

telemetryRouter.use(authenticate);
telemetryRouter.get('/consent', asyncHandler(getConsentHandler));
telemetryRouter.patch('/consent', validate(setConsentSchema), asyncHandler(setConsentHandler));
telemetryRouter.post(
  '/events',
  telemetryRateLimit,
  validate(recordEventsSchema),
  asyncHandler(recordEventsHandler),
);
