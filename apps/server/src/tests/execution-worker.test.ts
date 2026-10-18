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
  lpush: vi.fn<(key: string, value: string) => Promise<number>>(),
  findMany: vi.fn<(args: unknown) => Promise<Array<{ id: string }>>>(),
};

vi.mock('../shared/lib/redis.js', () => ({
  redis: {
    status: 'ready',
    setex: () => Promise.resolve('OK'),
    lpush: (key: string, value: string) => control.lpush(key, value),
  },
  isRedisReady: () => control.ready,
  waitForRedisReady: () => (control.wait ? control.wait() : Promise.resolve()),
  connectRedis: () => Promise.resolve(),
}));

vi.mock('../shared/lib/prisma.js', () => ({
  prisma: {
    submission: {
      findMany: (args: unknown) => control.findMany(args),
    },
  },
}));

const { startExecutionWorker, requeueStuckSubmissions, STUCK_QUEUED_AFTER_MS } =
  await import('../modules/challenges/execution.worker.js');

const STREAM_ERROR = "Stream isn't writeable and enableOfflineQueue options is false";

beforeEach(() => {
  control.ready = true;
  control.wait = null;
  control.lpush.mockReset();
  control.findMany.mockReset();
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

describe('requeueStuckSubmissions', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  it('re-enqueues rows stuck in QUEUED past the cutoff', async () => {
    control.findMany.mockResolvedValue([{ id: 'sub-old' }]);
    control.lpush.mockResolvedValue(1);

    await expect(requeueStuckSubmissions(now)).resolves.toBe(1);

    expect(control.findMany).toHaveBeenCalledWith({
      where: {
        status: 'QUEUED',
        createdAt: { lte: new Date(now.getTime() - STUCK_QUEUED_AFTER_MS) },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    expect(control.lpush).toHaveBeenCalledWith('cte:execution:queue', 'sub-old');
  });

  it('returns 0 without touching Redis when nothing is stuck', async () => {
    control.findMany.mockResolvedValue([]);

    await expect(requeueStuckSubmissions(now)).resolves.toBe(0);
    expect(control.lpush).not.toHaveBeenCalled();
  });

  it('stops the sweep when Redis rejects the push', async () => {
    control.findMany.mockResolvedValue([{ id: 'sub-1' }, { id: 'sub-2' }]);
    control.lpush
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error("Stream isn't writeable and enableOfflineQueue is false"));
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(requeueStuckSubmissions(now)).resolves.toBe(1);

    expect(control.lpush).toHaveBeenCalledTimes(2);
    const logs = write.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logs).toContain("Stream isn't writeable");
  });
});
