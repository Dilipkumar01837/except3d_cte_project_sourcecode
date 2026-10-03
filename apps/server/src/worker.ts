import { connectRedis } from './shared/lib/redis.js';
import { startExecutionWorker } from './modules/challenges/execution.worker.js';
import { startDuelSweeper } from './modules/duels/duel.service.js';
import { startTelemetryRetentionSweeper } from './modules/telemetry/telemetry-retention.js';

// Best-effort Redis connection. If Redis is not up yet the worker still starts
// and the ioredis retryStrategy keeps reconnecting with backoff, so the queue
// recovers on its own once Redis becomes available.
void connectRedis().catch(() => {
  process.stderr.write('[worker] Redis unavailable at startup - will retry with backoff\n');
});
// Abandon duels that passed their time window. Runs here rather than in the HTTP
// process so multiple API replicas do not each sweep.
startDuelSweeper();
// Prune telemetry events past the retention window (opt-in events only).
startTelemetryRetentionSweeper();
void startExecutionWorker();
