/**
 * Unit tests for the Redis-backed rate-limit store.
 *
 * Redis is mocked rather than used for real: the store's contract is about TTL
 * arithmetic and failure handling, and asserting that against a live server would
 * make the suite depend on a service. The behaviour that matters in production
 * beyond this file is simply "does Redis count the same hits", which is ioredis's
 * job to guarantee for INCR.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable state the fake Redis reads, so a test can simulate an outage.
const state = {
  available: true,
  /** key -> remaining TTL in ms, absent when the key has no expiry. */
  ttl: new Map<string, number>(),
  /** key -> current integer value. */
  values: new Map<string, number>(),
  pexpireCalls: [] as Array<[string, number]>,
};

const fakeRedis = {
  get status(): string {
    return state.available ? 'ready' : 'end';
  },
  on: vi.fn(),
  connect: vi.fn(() => Promise.resolve()),
  multi() {
    type Job = () => Promise<[Error | null, unknown]>;
    const queued: Job[] = [];
    const pipeline = {
      incr(key: string) {
        queued.push(() => {
          if (!state.available) return Promise.resolve([new Error('connection refused'), null]);
          const next = (state.values.get(key) ?? 0) + 1;
          state.values.set(key, next);
          return Promise.resolve([null, next]);
        });
        return pipeline;
      },
      pttl(key: string) {
        queued.push(() => {
          if (!state.available) return Promise.resolve([new Error('connection refused'), null]);
          const remaining = state.ttl.get(key);
          // ioredis reports -2 for a missing key and -1 for no expiry.
          if (remaining === undefined) {
            return Promise.resolve([null, state.values.has(key) ? -1 : -2]);
          }
          return Promise.resolve([null, remaining]);
        });
        return pipeline;
      },
      async exec() {
        const out: Array<[Error | null, unknown]> = [];
        for (const run of queued) out.push(await run());
        return out;
      },
    };
    return pipeline;
  },
  pexpire(key: string, ms: number) {
    if (!state.available) return Promise.reject(new Error('connection refused'));
    state.ttl.set(key, ms);
    state.pexpireCalls.push([key, ms]);
    return Promise.resolve(1);
  },
  decr(key: string) {
    if (!state.available) return Promise.reject(new Error('connection refused'));
    const next = (state.values.get(key) ?? 0) - 1;
    state.values.set(key, next);
    return Promise.resolve(next);
  },
  set(key: string, value: string) {
    if (!state.available) return Promise.reject(new Error('connection refused'));
    state.values.set(key, Number(value));
    return Promise.resolve('OK');
  },
  del(...keys: string[]) {
    if (!state.available) return Promise.reject(new Error('connection refused'));
    for (const key of keys) {
      state.values.delete(key);
      state.ttl.delete(key);
    }
    return Promise.resolve(keys.length);
  },
  scan() {
    return Promise.resolve(['0', [] as string[]] as [string, string[]]);
  },
};

vi.mock('../shared/lib/redis.js', () => ({ redis: fakeRedis }));

const { RedisRateLimitStore } = await import('../shared/lib/rate-limit-store.js');

const WINDOW = 60_000;

function makeStore(): InstanceType<typeof RedisRateLimitStore> {
  const store = new RedisRateLimitStore('auth');
  store.init({ windowMs: WINDOW, max: 5 } as never);
  return store;
}

beforeEach(() => {
  state.available = true;
  state.ttl = new Map();
  state.values = new Map();
  state.pexpireCalls = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RedisRateLimitStore', () => {
  it('counts hits against a single shared counter', async () => {
    const store = makeStore();
    expect((await store.increment('a')).totalHits).toBe(1);
    expect((await store.increment('a')).totalHits).toBe(2);
    expect((await store.increment('a')).totalHits).toBe(3);
  });

  it('keeps counters independent per key', async () => {
    const store = makeStore();
    await store.increment('a');
    await store.increment('a');
    expect((await store.increment('b')).totalHits).toBe(1);
    // "a" is unaffected by the hit on "b": 1, 2, then 3.
    expect((await store.increment('a')).totalHits).toBe(3);
  });

  it('namespaces keys so two limiters cannot collide', async () => {
    const store = makeStore();
    await store.increment('shared');
    expect(state.values.has('cte:ratelimit:auth:shared')).toBe(true);
  });

  it('sets the expiry only on the first hit, keeping the window fixed', async () => {
    const store = makeStore();
    await store.increment('a');
    await store.increment('a');
    await store.increment('a');
    expect(state.pexpireCalls).toHaveLength(1);
    expect(state.pexpireCalls[0]).toEqual(['cte:ratelimit:auth:a', WINDOW]);
  });

  it('repairs a counter that exists without a TTL', async () => {
    const store = makeStore();
    // Simulates an expired TTL with the key still present: PTTL reports -1.
    state.values.set('cte:ratelimit:auth:a', 7);
    const result = await store.increment('a');
    expect(result.totalHits).toBe(8);
    expect(state.pexpireCalls).toHaveLength(1);
  });

  it('reports a reset time inside the window', async () => {
    const store = makeStore();
    const before = Date.now();
    const result = await store.increment('a');
    // The `Store` interface types resetTime as optional, but this store always
    // sets it, so narrow before asserting.
    const resetTime = result.resetTime;
    expect(resetTime).toBeDefined();
    expect(resetTime?.getTime()).toBeGreaterThanOrEqual(before);
    expect(resetTime?.getTime()).toBeLessThanOrEqual(Date.now() + WINDOW);
  });

  it('decrements a counter', async () => {
    const store = makeStore();
    await store.increment('a'); // 1
    await store.increment('a'); // 2
    await store.decrement('a'); // 1
    expect((await store.increment('a')).totalHits).toBe(2);
  });

  it('never lets a counter go negative', async () => {
    const store = makeStore();
    await store.increment('a');
    await store.decrement('a');
    await store.decrement('a');
    expect(state.values.get('cte:ratelimit:auth:a')).toBe(0);
  });

  it('clears a key on resetKey', async () => {
    const store = makeStore();
    await store.increment('a');
    await store.resetKey('a');
    expect(state.values.has('cte:ratelimit:auth:a')).toBe(false);
    expect((await store.increment('a')).totalHits).toBe(1);
  });

  describe('when Redis is unavailable', () => {
    beforeEach(() => {
      state.available = false;
    });

    it('still counts hits instead of failing the request', async () => {
      const store = makeStore();
      expect((await store.increment('a')).totalHits).toBe(1);
      expect((await store.increment('a')).totalHits).toBe(2);
      expect((await store.increment('a')).totalHits).toBe(3);
    });

    it('reports degradation only once, not on every request', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const store = makeStore();
      await store.increment('a');
      await store.increment('a');
      await store.increment('a');
      const degradationWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('Redis unavailable'),
      );
      expect(degradationWarnings).toHaveLength(1);
    });

    it('keeps increment, decrement and reset from throwing', async () => {
      const store = makeStore();
      await store.increment('a');
      await expect(store.decrement('a')).resolves.toBeUndefined();
      await expect(store.resetKey('a')).resolves.toBeUndefined();
    });

    it('resumes using Redis after it recovers', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const store = makeStore();
      await store.increment('a'); // degraded, counted in memory

      state.available = true;
      // A fresh key is served by Redis, so its count starts from Redis's state.
      expect((await store.increment('b')).totalHits).toBe(1);
      expect(state.values.has('cte:ratelimit:auth:b')).toBe(true);
    });
  });

  it('identifies itself by instance so limiters are not conflated', () => {
    // Without this, every limiter is the same `RedisRateLimitStore` by
    // constructor name and express-rate-limit reports ERR_ERL_DOUBLE_COUNT when
    // a request legitimately passes through two of them.
    expect(makeStore().localKeys).toBe(true);
  });
});
