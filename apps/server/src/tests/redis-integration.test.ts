/**
 * Live Redis integration check for the execution queue and worker loop.
 *
 * Unit tests mock Redis; this file proves the real transport works: a submission
 * id enqueued over a real connection is dequeued and consumed by the worker
 * loop. It self-skips when no Redis is reachable (a machine without one), but
 * fails loudly under REQUIRE_REDIS=1 so CI — which runs a Redis service — cannot
 * silently skip it.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const requireRedis = process.env['REQUIRE_REDIS'] === '1';

const { connectRedis, redis } = await import('../shared/lib/redis.js');
const { EXECUTION_QUEUE_KEY, dequeueSubmission, enqueueSubmission } =
  await import('../modules/challenges/execution.queue.js');
const { startExecutionWorker } = await import('../modules/challenges/execution.worker.js');

let available = true;
try {
  await connectRedis(2_000);
} catch {
  available = false;
}

if (requireRedis && !available) {
  throw new Error(`REQUIRE_REDIS=1 but Redis is not reachable at ${redisUrl}`);
}

afterAll(async () => {
  if (available) {
    await redis.del(EXECUTION_QUEUE_KEY).catch(() => undefined);
  }
  redis.disconnect();
});

describe.skipIf(!available)('execution queue (live Redis)', () => {
  it('round-trips a submission id through the real queue', async () => {
    await redis.del(EXECUTION_QUEUE_KEY);
    const id = `itest-${randomUUID()}`;
    await enqueueSubmission(id);
    await expect(dequeueSubmission(2)).resolves.toBe(id);
  });

  it('drains a real queued job through the worker loop', async () => {
    await redis.del(EXECUTION_QUEUE_KEY);
    const id = `itest-${randomUUID()}`;
    await enqueueSubmission(id);

    const controller = new AbortController();
    const processed: string[] = [];

    await startExecutionWorker({
      signal: controller.signal,
      dequeueTimeoutSeconds: 1,
      process: (submissionId) => {
        processed.push(submissionId);
        controller.abort();
        return Promise.resolve();
      },
    });

    expect(processed).toContain(id);
  });
});
