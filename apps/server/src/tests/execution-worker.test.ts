/**
 * Worker loop resilience.
 *
 * The consumer must not issue a dequeue while the Redis client is not ready
 * (that rejects with the stream error under `enableOfflineQueue: false`), must
 * survive a transient dequeue failure and keep processing, and must stop when
 * its signal is aborted. `dequeue` / `process` are injected so the real judge
 * and database are never touched; the readiness helpers are mocked so the
 * not-ready -> ready transition can be driven directly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const control = {
  ready: true,
  wait: null as null | (() => Promise<void>),
};

vi.mock('../shared/lib/redis.js', () => ({
  redis: { status: 'ready', setex: () => Promise.resolve('OK') },
  isRedisReady: () => control.ready,
  waitForRedisReady: () => (control.wait ? control.wait() : Promise.resolve()),
  connectRedis: () => Promise.resolve(),
}));

const { startExecutionWorker } = await import('../modules/challenges/execution.worker.js');

const STREAM_ERROR = "Stream isn't writeable and enableOfflineQueue options is false";

beforeEach(() => {
  control.ready = true;
  control.wait = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('startExecutionWorker', () => {
  it('does not dequeue until Redis is ready', async () => {
    control.ready = false;
    let release!: () => void;
    control.wait = () =>
      new Promise<void>((resolve) => {
        release = resolve;
      });

    const controller = new AbortController();
    const order: string[] = [];
    const dequeue = vi.fn(() => {
      order.push('dequeue');
      controller.abort();
      return Promise.resolve(null);
    });

    const running = startExecutionWorker({
      signal: controller.signal,
      dequeue,
      process: vi.fn(() => Promise.resolve(undefined)),
    });

    // The loop is parked waiting for readiness, so no command has been issued.
    await Promise.resolve();
    expect(dequeue).not.toHaveBeenCalled();

    control.ready = true;
    release();
    await running;
    expect(order).toEqual(['dequeue']);
  });

  it('processes a dequeued submission', async () => {
    const controller = new AbortController();
    const processJob = vi.fn(() => {
      controller.abort();
      return Promise.resolve(undefined);
    });
    const dequeue = vi.fn(() => Promise.resolve('job-1'));

    await startExecutionWorker({
      signal: controller.signal,
      dequeue,
      process: processJob,
      retryBaseMs: 1,
      retryMaxMs: 1,
    });

    expect(processJob).toHaveBeenCalledWith('job-1');
  });

  it('recovers after a temporary dequeue failure', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const controller = new AbortController();
    let attempt = 0;
    const dequeue = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new Error(STREAM_ERROR));
      controller.abort();
      return Promise.resolve('job-1');
    });
    const processJob = vi.fn(() => Promise.resolve(undefined));

    await startExecutionWorker({
      signal: controller.signal,
      dequeue,
      process: processJob,
      retryBaseMs: 1,
      retryMaxMs: 1,
    });

    expect(processJob).toHaveBeenCalledWith('job-1');
    const logs = write.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logs).toContain(STREAM_ERROR);
    expect(logs).toContain('Redis connection recovered');
  });

  it('does nothing when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const dequeue = vi.fn(() => Promise.resolve(null));

    await startExecutionWorker({
      signal: controller.signal,
      dequeue,
      process: vi.fn(() => Promise.resolve(undefined)),
    });

    expect(dequeue).not.toHaveBeenCalled();
  });
});
