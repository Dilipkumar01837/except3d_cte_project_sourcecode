import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../lib/rate-limit-store.js';

const IS_TEST = process.env['NODE_ENV'] === 'test';
const IS_DEV = process.env['NODE_ENV'] === 'development';
const RELAXED = IS_TEST || IS_DEV;

/**
 * Counters live in Redis so a limit applies to the player rather than to whichever
 * replica served the previous request. See rate-limit-store.ts for the outage
 * behaviour. `standardHeaders: true` still reports the real window.
 */
function limiter(options: {
  name: string;
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: { user?: { sub?: string }; ip?: string }) => string;
}): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisRateLimitStore(options.name),
    ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: options.message },
    },
  });
}

export const authRateLimit = limiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000,
  max: RELAXED ? 10_000 : 20,
  message: 'Too many requests, please try again later.',
});

export const generalRateLimit = limiter({
  name: 'general',
  windowMs: 15 * 60 * 1000,
  max: RELAXED ? 10_000 : 100,
  message: 'Too many requests, please try again later.',
});

/** Limits expensive code-execution requests independently from normal API traffic. */
export const submissionRateLimit = limiter({
  name: 'submission',
  windowMs: 60 * 1000,
  max: RELAXED ? 10_000 : 10,
  message: 'Too many code executions. Please wait a minute.',
});

export const aiHintRateLimit = limiter({
  name: 'ai-hint',
  windowMs: 60 * 60 * 1000,
  max: RELAXED ? 10_000 : 20,
  message: 'Too many AI hint requests. Please try again later.',
  // Per account, not per IP: an authenticated player behind a shared address
  // must not consume another player's burst allowance. The route runs
  // `authenticate` first, so req.user is always present here.
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
});

/**
 * Telemetry is batched client-side, so the limit is per account and generous
 * enough for normal flushing. Keyed by account for the same reason as AI hints.
 */
export const telemetryRateLimit = limiter({
  name: 'telemetry',
  windowMs: 60 * 1000,
  max: RELAXED ? 10_000 : 120,
  message: 'Too many telemetry batches. Please wait a moment.',
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
});
