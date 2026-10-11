/**
 * Readiness gate for the execution queue.
 *
 * With the shared client's `enableOfflineQueue: false`, calling LPUSH/BRPOP while
 * the client is not ready rejects with ioredis's opaque stream error. These tests
 * prove the queue refuses the command up front with a typed error instead — and
 * never invokes ioredis — so the worker can wait it out rather than spin.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  ready: true,
  lpush: vi.fn<(key: string, value: string) => Promise<number>>(),
  brpop: vi.fn<(key: string, timeoutSeconds: number) => Promise<[string, string] | null>>(),
};

vi.mock('../shared/lib/redis.js', () => ({
  redis: {
    get status(): string {
      return state.ready ? 'ready' : 'reconnecting';
    },
    lpush: (key: string, value: string) => state.lpush(key, value),
    brpop: (key: string, timeoutSeconds: number) => state.brpop(key, timeoutSeconds),
  },
  isRedisReady: () => state.ready,
  waitForRedisReady: () => Promise.resolve(),
  connectRedis: () => Promise.resolve(),
}));

const { enqueueSubmission, dequeueSubmission, RedisNotReadyError } =
  await import('../modules/challenges/execution.queue.js');

beforeEach(() => {
  state.ready = true;
  state.lpush.mockReset();
  state.brpop.mockReset();
});

describe('execution queue', () => {
  it('enqueues a submission when Redis is ready', async () => {
    state.lpush.mockResolvedValue(1);
    await enqueueSubmission('sub-1');
    expect(state.lpush).toHaveBeenCalledWith('cte:execution:queue', 'sub-1');
  });

  it('dequeues a submission id when Redis is ready', async () => {
    state.brpop.mockResolvedValue(['cte:execution:queue', 'sub-1']);
    await expect(dequeueSubmission(2)).resolves.toBe('sub-1');
    expect(state.brpop).toHaveBeenCalledWith('cte:execution:queue', 2);
  });

  it('returns null on an empty queue without inventing a job', async () => {
    state.brpop.mockResolvedValue(null);
    await expect(dequeueSubmission(2)).resolves.toBeNull();
  });

  describe('when Redis is not ready', () => {
    beforeEach(() => {
      state.ready = false;
    });

    it('refuses to enqueue instead of hitting ioredis', async () => {
      await expect(enqueueSubmission('sub-1')).rejects.toBeInstanceOf(RedisNotReadyError);
      expect(state.lpush).not.toHaveBeenCalled();
    });

    it('refuses to dequeue instead of hitting ioredis', async () => {
      await expect(dequeueSubmission(2)).rejects.toBeInstanceOf(RedisNotReadyError);
      expect(state.brpop).not.toHaveBeenCalled();
    });
  });
});
