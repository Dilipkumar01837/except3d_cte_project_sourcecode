import { connectRedis } from './shared/lib/redis.js';
import { startExecutionWorker } from './modules/challenges/execution.worker.js';

// Best-effort Redis connection — the worker will still start and attempt
// reconnection via ioredis retryStrategy when Redis becomes available.
void connectRedis().catch(() => {
  process.stderr.write(
    '[worker] Redis unavailable at startup — worker will retry connections automatically\n',
  );
});
void startExecutionWorker();
