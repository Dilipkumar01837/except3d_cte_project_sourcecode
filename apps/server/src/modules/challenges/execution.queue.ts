import { redis, isRedisReady } from '../../shared/lib/redis.js';

export const EXECUTION_QUEUE_KEY = 'cte:execution:queue';

/**
 * Thrown when a queue operation is attempted before the Redis client is ready.
 *
 * The shared client runs with `enableOfflineQueue: false`, so ioredis rejects a
 * command issued against a non-writable stream with the opaque message
 * "Stream isn't writeable and enableOfflineQueue options is false". Raising a
 * typed error instead lets the worker treat "not connected" as a recoverable
 * condition it can wait out, rather than a bad command.
 */
export class RedisNotReadyError extends Error {
  constructor(status: string) {
    super(`Redis client is not ready (status: ${status}); retry once it is connected`);
    this.name = 'RedisNotReadyError';
  }
}

/** Never issue a queue command while the client cannot write to its stream. */
function assertRedisReady(): void {
  if (!isRedisReady()) throw new RedisNotReadyError(redis.status);
}

/** The queue stores only submission IDs; source and test cases stay in PostgreSQL. */
export async function enqueueSubmission(submissionId: string): Promise<void> {
  assertRedisReady();
  await redis.lpush(EXECUTION_QUEUE_KEY, submissionId);
}

export async function dequeueSubmission(timeoutSeconds = 5): Promise<string | null> {
  assertRedisReady();
  const item = await redis.brpop(EXECUTION_QUEUE_KEY, timeoutSeconds);
  return item?.[1] ?? null;
}
