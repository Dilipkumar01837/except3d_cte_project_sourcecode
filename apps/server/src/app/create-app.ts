import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { API_BASE_PATH } from '@code-to-escape/shared';
import { env } from '../config/index.js';
import { healthRouter } from '../modules/health/index.js';
import { authRouter } from '../modules/auth/index.js';
import { playerRouter } from '../modules/player/index.js';
import { challengeRouter } from '../modules/challenges/index.js';
import { adminRouter } from '../modules/admin/index.js';
import { dailyRewardRouter } from '../modules/daily-reward/index.js';
import { duelRouter } from '../modules/duels/index.js';
import { errorHandler } from '../shared/middleware/error-handler.js';
import { generalRateLimit } from '../shared/middleware/rate-limit.js';
import { requestLogger } from '../shared/middleware/request-logger.js';

export function createApp(): ReturnType<typeof express> {
  const app = express();

  // Security headers — helmet sets X-Content-Type-Options, X-Frame-Options, etc.
  // We add an explicit CSP for the API (no browser presentation so restrictive is fine).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Request-ID'],
    }),
  );
  app.use(compression());
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(generalRateLimit);

  app.use(`${API_BASE_PATH}/health`, healthRouter);
  app.use(`${API_BASE_PATH}/auth`, authRouter);
  app.use(`${API_BASE_PATH}/player`, playerRouter);
  app.use(`${API_BASE_PATH}/challenges`, challengeRouter);
  app.use(`${API_BASE_PATH}/admin`, adminRouter);
  app.use(`${API_BASE_PATH}/player/daily-reward`, dailyRewardRouter);
  app.use(`${API_BASE_PATH}/duels`, duelRouter);

  app.use(errorHandler);

  return app;
}
