import { Redis } from 'ioredis';
import { env } from '../../config/index.js';

export const redis = new Redis(env.redisUrl, {
  connectTimeout: 2_000,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: () => {
    return null;
  },
});

// Attach an error listener so connection failures don't become unhandled
// rejections or crash the process when Redis is unavailable.
redis.on('error', () => {
  // Intentional no-op — connection errors are surfaced at the call site
  // through rejected promises (maxRetriesPerRequest: 1).
});

export async function connectRedis(): Promise<void> {
  if (redis.status === 'wait') {
    await Promise.race([
      redis.connect(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Redis connection timed out'));
        }, 2_000);
      }),
    ]);
  }
}
