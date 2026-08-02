import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv({ path: resolve(process.cwd(), '.env') });

const IS_PROD = process.env['NODE_ENV'] === 'production';

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Require a real value in production — throw if the placeholder default is still set. */
function getSecret(key: string, devDefault: string): string {
  const value = process.env[key] ?? devDefault;
  if (IS_PROD && value === devDefault) {
    throw new Error(
      `[SECURITY] Environment variable ${key} must be set to a unique secret in production.`,
    );
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
  jwtSecret: getSecret('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '15m'),
  refreshTokenSecret: getSecret('REFRESH_TOKEN_SECRET', 'change-me-in-production-refresh'),
  refreshTokenExpiresIn: getEnv('REFRESH_TOKEN_EXPIRES_IN', '30d'),
  appUrl: getEnv('APP_URL', 'http://localhost:5173'),
  codeRunnerUrl: getEnv('CODE_RUNNER_URL', 'http://localhost:3002'),
  codeRunnerToken: getSecret('CODE_RUNNER_TOKEN', 'code-to-escape-dev-runner-token'),
  // OAuth — optional, disabled when empty
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
  githubClientId: getEnv('GITHUB_CLIENT_ID', ''),
  githubClientSecret: getEnv('GITHUB_CLIENT_SECRET', ''),
};
