import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number.parseInt(getEnv('PORT', '3001'), 10),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173').split(','),
  databaseUrl: getEnv(
    'DATABASE_URL',
    'postgresql://cte:cte_dev_password@localhost:5432/code_to_escape',
  ),
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),
  jwtSecret: getEnv('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '15m'),
  refreshTokenSecret: getEnv('REFRESH_TOKEN_SECRET', 'change-me-in-production-refresh'),
  refreshTokenExpiresIn: getEnv('REFRESH_TOKEN_EXPIRES_IN', '30d'),
  appUrl: getEnv('APP_URL', 'http://localhost:5173'),
};
