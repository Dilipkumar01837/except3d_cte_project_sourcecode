import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { API_BASE_PATH } from '@code-to-escape/shared';
import { env } from '../config/index.js';
import { healthRouter } from '../modules/health/index.js';
import { authRouter } from '../modules/auth/index.js';
import { errorHandler } from '../shared/middleware/error-handler.js';

export function createApp(): ReturnType<typeof express> {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json());
  app.use(cookieParser());

  app.use(`${API_BASE_PATH}/health`, healthRouter);
  app.use(`${API_BASE_PATH}/auth`, authRouter);

  app.use(errorHandler);

  return app;
}
