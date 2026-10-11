import { connectRedis, isRedisReady, redis } from '../src/shared/lib/redis.js';
import {
  EXECUTION_QUEUE_KEY,
  dequeueSubmission,
  enqueueSubmission,
} from '../src/modules/challenges/execution.queue.js';

console.log('before', redis.status);
await connectRedis(3000);
console.log('after', redis.status, isRedisReady(), redis.options.host, redis.options.port);
await redis.del(EXECUTION_QUEUE_KEY);
await enqueueSubmission('probe-1');
console.log('llen', await redis.llen(EXECUTION_QUEUE_KEY));
const got = await dequeueSubmission(2);
console.log('dequeued', got);
redis.disconnect();
