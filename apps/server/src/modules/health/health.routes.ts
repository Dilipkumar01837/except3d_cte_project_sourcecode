import { Router, type IRouter } from 'express';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { getHealth, getReadiness } from './health.controller.js';

export const healthRouter: IRouter = Router();

/** Lightweight liveness check — always fast, no external deps */
healthRouter.get('/', getHealth);

/** Deeper readiness check — verifies DB, Redis, and code runner reachability */
healthRouter.get('/readiness', asyncHandler(getReadiness));
