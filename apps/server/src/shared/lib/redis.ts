import { Redis } from 'ioredis';
import { env } from '../../config/index.js';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

export async function connectRedis(): Promise<void> {
  if (redis.status === 'wait') {
    await redis.connect();
  }
}
