/**
 * Shared rate-limit counters in Redis.
 *
 * `express-rate-limit`'s default MemoryStore keeps counters in the process, so a
 * two-replica deployment gave every replica its own independent budget: a client
 * could send `max` requests to each replica and still be admitted `max * replicas`
 * times. Restarting a replica also reset every counter.
 *
 * This store moves the counters to Redis so limits hold across replicas and
 * restarts. It is deliberately a plain `Store` implementation rather than the
 * third-party `rate-limit-redis` package: the app already depends on `ioredis`
 * and a shared client, so adding another dependency and a second connection pool
 * would be cost without benefit.
 *
 * Failure policy: fail *open*, to an in-memory counter, rather than returning 500.
 * Losing rate limiting during a Redis outage is bad; making every request error
 * because the limiter is down is worse. The fallback is logged once so the
 * degradation is visible instead of silent.
 */

import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { redis } from './redis.js';

/** A bucket with a definite reset time. `express-rate-limit` declares
 * `resetTime` as `Date | undefined`, but this store always has one, so it tracks
 * the stricter shape internally and narrows on return. */
interface Bucket {
  totalHits: number;
  resetTime: Date;
}

/** `[error, result]` as ioredis returns it from `multi().exec()`. */
type ExecEntry<T> = [Error | null, T];

/**
 * Deliberately not exported: the memory store is a degraded-mode implementation
 * detail, and callers should always go through the Redis store below.
 */
class InMemoryBucketStore implements Store {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private windowMs: number) {}

  setWindowMs(windowMs: number): void {
    this.windowMs = windowMs;
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetTime.getTime() <= now) this.buckets.delete(key);
    }
  }

  // `Store` is async, but this implementation is synchronous. Return resolved
  // promises rather than marking these `async`, which would be a lie the lint
  // rule (rightly) rejects.
  increment(key: string): Promise<Bucket> {
    const now = Date.now();
    this.prune(now);
    const existing = this.buckets.get(key);
    if (existing && existing.resetTime.getTime() > now) {
      existing.totalHits += 1;
      return Promise.resolve(existing);
    }
    const bucket: Bucket = { totalHits: 1, resetTime: new Date(now + this.windowMs) };
    this.buckets.set(key, bucket);
    return Promise.resolve(bucket);
  }

  decrement(key: string): Promise<void> {
    const bucket = this.buckets.get(key);
    if (bucket) bucket.totalHits = Math.max(0, bucket.totalHits - 1);
    return Promise.resolve();
  }

  resetKey(key: string): Promise<void> {
    this.buckets.delete(key);
    return Promise.resolve();
  }
}

export class RedisRateLimitStore implements Store {
  /**
   * Tells `express-rate-limit` to identify this store by instance rather than by
   * constructor name when running its validations. Every limiter here is a
   * `RedisRateLimitStore`, so name-based identification made a request that
   * legitimately passes through two limiters (e.g. `general` then `auth`) look
   * like a single limiter being counted twice, and it logged
   * ERR_ERL_DOUBLE_COUNT on every such request.
   */
  readonly localKeys = true;

  private readonly fallback: InMemoryBucketStore;
  private degraded = false;
  private windowMs = 60_000;

  constructor(private readonly namespace: string) {
    this.fallback = new InMemoryBucketStore(this.windowMs);
  }

  private key(key: string): string {
    return `cte:ratelimit:${this.namespace}:${key}`;
  }

  /** Marks the first failure and reports degradation once, not on every request. */
  private markDegraded(error: unknown): void {
    if (this.degraded) return;
    this.degraded = true;
    console.warn(
      `[rate-limit] Redis unavailable for "${this.namespace}", falling back to ` +
        `per-process counters until it recovers: ${
          error instanceof Error ? error.message : String(error)
        }`,
    );
  }

  private markHealthy(): void {
    this.degraded = false;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.fallback.setWindowMs(options.windowMs);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.key(key);
    try {
      // INCR returns the new value, so a result of 1 means this is the first hit
      // in the window and the TTL has not been set yet. Setting the TTL only on
      // the first hit keeps the window fixed-length instead of sliding forward
      // with every request.
      const pipeline = redis.multi();
      pipeline.incr(redisKey);
      pipeline.pttl(redisKey);
      const results = (await pipeline.exec()) as [ExecEntry<number>, ExecEntry<number>] | null;
      if (!results) throw new Error('Redis transaction returned no result');

      const [incrError, incrValue] = results[0];
      if (incrError) throw incrError;
      const totalHits = incrValue;

      const [ttlError, ttlValue] = results[1];
      const ttl = ttlError ? -1 : ttlValue;

      let resetMs: number;
      if (totalHits === 1 || ttl < 0) {
        await redis.pexpire(redisKey, this.windowMs);
        resetMs = Date.now() + this.windowMs;
      } else {
        resetMs = Date.now() + ttl;
      }

      this.markHealthy();
      return { totalHits, resetTime: new Date(resetMs) };
    } catch (error) {
      this.markDegraded(error);
      return this.fallback.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const total = await redis.decr(this.key(key));
      // Don't let a decremented counter fall below zero, and don't leave a
      // negative counter that would under-count the next window.
      if (total < 0) await redis.set(this.key(key), '0', 'PX', this.windowMs);
      this.markHealthy();
    } catch (error) {
      this.markDegraded(error);
      await this.fallback.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await redis.del(this.key(key));
      this.markHealthy();
    } catch (error) {
      this.markDegraded(error);
      await this.fallback.resetKey(key);
    }
  }

  /** Clears every counter for this limiter. Used by tests. */
  async resetAll(): Promise<void> {
    const pattern = `cte:ratelimit:${this.namespace}:*`;
    try {
      let cursor = '0';
      do {
        const [next, found] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = next;
        if (found.length > 0) await redis.del(...found);
      } while (cursor !== '0');
      this.markHealthy();
    } catch (error) {
      this.markDegraded(error);
    }
  }
}
