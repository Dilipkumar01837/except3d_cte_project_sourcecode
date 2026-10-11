import { connectRedis } from './shared/lib/redis.js';
import { startExecutionWorker } from './modules/challenges/execution.worker.js';
import { startDuelSweeper } from './modules/duels/duel.service.js';
import { startTelemetryRetentionSweeper } from './modules/telemetry/telemetry-retention.js';

// Abandon duels that passed their time window. Runs here rather than in the HTTP
// process so multiple API replicas do not each sweep.
startDuelSweeper();
// Prune telemetry events past the retention window (opt-in events only).
startTelemetryRetentionSweeper();
// Best-effort connect before consuming. This is awaited only to order startup
// (connect, then consume); if Redis is down the worker still starts and
// `startExecutionWorker` waits for readiness itself, so a transient outage or a
// restart does not kill the queue.
await connectRedis().catch(() => {
  process.stderr.write('[worker] Redis unavailable at startup - waiting for it to come up\n');
});
void startExecutionWorker();
