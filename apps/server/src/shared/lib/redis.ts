import { Redis } from 'ioredis';
import { env } from '../../config/index.js';

export const redis = new Redis(env.redisUrl, {
  connectTimeout: 2_000,
  maxRetriesPerRequest: 1,
  // Fail fast instead of buffering commands in memory while Redis is down: the
  // HTTP path is expected to degrade (rate-limit store falls back to per-process
  // counters) rather than queue unbounded work. Because the offline queue is
  // disabled, a command sent before the client is `ready` rejects immediately
  // ("Stream isn't writeable and enableOfflineQueue options is false"). Callers
  // must therefore gate on readiness — see `isRedisReady` / `waitForRedisReady`.
  enableOfflineQueue: false,
  lazyConnect: true,
  // Reconnect with capped backoff. Returning null would permanently abandon the
  // connection after a single failure, so a transient Redis restart left the
  // execution queue dead for the remaining lifetime of the process.
  retryStrategy: (times) => Math.min(times * 200, 5_000),
});

/** True once the client has completed its handshake and accepts commands. */
export function isRedisReady(): boolean {
  return redis.status === 'ready';
}

// Connection errors are frequent while Redis is unreachable (every retry). Log
// the first failure and then at most once per window so the degradation is
// visible without flooding the log; log a single recovery line when it returns.
const ERROR_LOG_INTERVAL_MS = 5_000;
let lastErrorLogAt = 0;
let connectionDegraded = false;

redis.on('error', (error: Error) => {
  connectionDegraded = true;
  const now = Date.now();
  if (now - lastErrorLogAt < ERROR_LOG_INTERVAL_MS) return;
  lastErrorLogAt = now;
  process.stderr.write(`[redis] connection error: ${error.message}\n`);
});

redis.on('ready', () => {
  if (!connectionDegraded) return;
  connectionDegraded = false;
  lastErrorLogAt = 0;
  process.stderr.write('[redis] connection restored\n');
});

/**
 * Resolves once the shared client is `ready` (able to accept commands).
 *
 * Unlike a bare `redis.connect()`, this waits across the `connecting` /
 * `reconnecting` states and rejects only after `timeoutMs`, so a slow or
 * temporarily-down Redis can be awaited safely without ever issuing a command
 * against a non-writable stream. If the client is still idle (`wait`, because
 * of `lazyConnect`) it starts the connection; otherwise the background
 * `retryStrategy` reconnects and the `ready` event resolves this promise.
 */
export function waitForRedisReady(timeoutMs = 10_000): Promise<void> {
  if (redis.status === 'ready') return Promise.resolve();

  if (redis.status === 'wait') {
    // A rejection here just means the first attempt failed; retryStrategy keeps
    // reconnecting and the 'ready' listener below resolves once it succeeds.
    redis.connect().catch(() => undefined);
  }

  return new Promise<void>((resolve, reject) => {
    const onReady = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      redis.off('ready', onReady);
      reject(new Error(`Redis not ready after ${String(timeoutMs)}ms (status: ${redis.status})`));
    }, timeoutMs);
    // Do not hold the process open just because we are waiting for Redis.
    timer.unref();
    redis.once('ready', onReady);
  });
}

/** Bounded best-effort connect used on startup. Rejects if not ready in time. */
export async function connectRedis(timeoutMs = 2_000): Promise<void> {
  await waitForRedisReady(timeoutMs);
}
