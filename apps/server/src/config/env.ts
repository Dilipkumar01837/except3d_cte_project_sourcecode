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
  // A short secret makes every issued token brute-forceable offline, so a
  // low-entropy value must never reach production regardless of the default.
  if (IS_PROD && value.length < 32) {
    throw new Error(`[SECURITY] Environment variable ${key} must be at least 32 characters.`);
  }
  return value;
}

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  // 3000 is the canonical API port (matches .env.example, docker-compose and the
  // e2e suite). It was previously documented as 3001 here, which silently sent
  // anyone running without a .env to a port nothing else expected.
  port: Number.parseInt(getEnv('PORT', '3000'), 10),
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
  // Number of reverse-proxy hops to trust for req.ip. 0 disables it (direct
  // access); 1 is correct when a single nginx sits in front. Trusting more
  // lets a client spoof X-Forwarded-For and bypass IP rate limits.
  trustProxyHops: Number.parseInt(getEnv('TRUST_PROXY_HOPS', '1'), 10),
  // How often live sockets are re-checked against the account table, so a
  // suspension takes effect on connected sockets instead of waiting for the
  // access token to expire. Suspending also disconnects sockets immediately via
  // disconnectUserSockets, so this is a backstop for out-of-band changes
  // (direct database edits, a second API instance).
  socketAuthRevalidateMs: Number.parseInt(getEnv('SOCKET_AUTH_REVALIDATE_MS', '60000'), 10),
  // A duel that neither player finishes must not stay open forever. An OPEN
  // lobby is abandoned after 24h, an ACTIVE duel after 30 minutes.
  duelOpenTimeoutMs: Number.parseInt(getEnv('DUEL_OPEN_TIMEOUT_MS', '86400000'), 10),
  duelActiveTimeoutMs: Number.parseInt(getEnv('DUEL_ACTIVE_TIMEOUT_MS', '1800000'), 10),
  duelSweepIntervalMs: Number.parseInt(getEnv('DUEL_SWEEP_INTERVAL_MS', '60000'), 10),
  codeRunnerUrl: getEnv('CODE_RUNNER_URL', 'http://localhost:3002'),
  codeRunnerToken: getSecret('CODE_RUNNER_TOKEN', 'code-to-escape-dev-runner-token'),
  groqApiKey: getEnv('GROQ_API_KEY', ''),
  groqModel: getEnv('GROQ_MODEL', 'qwen/qwen3.8-27b'),
  // AI hints cost money and time, so each account gets a metered allowance in a
  // rolling window (default: 20 hints per 24h). The count is the durable
  // AiHintHistory rows, so the limit is per user and survives restarts; the
  // coarse HTTP limiter in rate-limit.ts only guards bursts.
  aiHintDailyLimit: Number.parseInt(getEnv('AI_HINT_DAILY_LIMIT', '20'), 10),
  aiHintWindowMs: Number.parseInt(getEnv('AI_HINT_WINDOW_MS', '86400000'), 10),
  // OAuth — optional, disabled when empty
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
  githubClientId: getEnv('GITHUB_CLIENT_ID', ''),
  githubClientSecret: getEnv('GITHUB_CLIENT_SECRET', ''),
};
