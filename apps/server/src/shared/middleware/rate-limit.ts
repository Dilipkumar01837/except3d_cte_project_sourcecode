import rateLimit from 'express-rate-limit';

const IS_TEST = process.env['NODE_ENV'] === 'test';
const IS_DEV = process.env['NODE_ENV'] === 'development';
const RELAXED = IS_TEST || IS_DEV;

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: RELAXED ? 10_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: RELAXED ? 10_000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});

/** Limits expensive code-execution requests independently from normal API traffic. */
export const submissionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: RELAXED ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many code executions. Please wait a minute.' },
  },
});

export const aiHintRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: RELAXED ? 10_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many AI hint requests. Please try again later.' },
  },
});
