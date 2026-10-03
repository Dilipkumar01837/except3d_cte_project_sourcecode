import { env } from '../../config/index.js';
import { purgeExpired } from './telemetry.service.js';

/**
 * Periodically deletes telemetry events older than the retention window. Runs in
 * the worker process so multiple API replicas do not each sweep.
 */
export function startTelemetryRetentionSweeper(
  intervalMs: number = env.telemetrySweepIntervalMs,
): void {
  const sweep = (): void => {
    void purgeExpired().catch((error: unknown) => {
      process.stderr.write(`[telemetry] retention sweep failed: ${String(error)}\n`);
    });
  };
  sweep();
  const timer = setInterval(sweep, intervalMs);
  // Do not keep the process alive solely for the sweep.
  timer.unref();
}
