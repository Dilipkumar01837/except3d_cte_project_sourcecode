/**
 * Readiness helpers for the shared Redis client.
 *
 * `waitForRedisReady` is what stops the worker from issuing commands against a
 * non-writable stream — which, with `enableOfflineQueue: false`, rejects with
 * ioredis's opaque "Stream isn't writeable and enableOfflineQueue options is
 * false" error. The real ioredis client is replaced with a controllable fake so
 * the ready / timeout transitions can be driven directly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeClient {
  status: string;
  connect: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => FakeClient;
  once: (event: string, listener: (...args: unknown[]) => void) => FakeClient;
  off: (event: string, listener: (...args: unknown[]) => void) => FakeClient;
  emit: (event: string, ...args: unknown[]) => boolean;
}

const hoisted = vi.hoisted(() => ({ instance: null as FakeClient | null }));

vi.mock('ioredis', () => {
  class FakeRedis {
    status = 'wait';
    private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor(_url: string, _options: Record<string, unknown>) {
      hoisted.instance = this;
    }

    on(event: string, listener: (...args: unknown[]) => void): this {
      const current = this.listeners.get(event) ?? [];
      current.push(listener);
      this.listeners.set(event, current);
      return this;
    }

    once(event: string, listener: (...args: unknown[]) => void): this {
      const wrapper = (...args: unknown[]): void => {
        this.off(event, wrapper);
        listener(...args);
      };
      return this.on(event, wrapper);
    }

    off(event: string, listener: (...args: unknown[]) => void): this {
      const current = this.listeners.get(event);
      if (current)
        this.listeners.set(
          event,
          current.filter((fn) => fn !== listener),
        );
      return this;
    }

    emit(event: string, ...args: unknown[]): boolean {
      const current = this.listeners.get(event) ?? [];
      for (const listener of [...current]) listener(...args);
      return current.length > 0;
    }

    connect(): Promise<void> {
      this.status = 'connecting';
      return Promise.resolve();
    }
  }

  return { Redis: FakeRedis };
});

const { isRedisReady, waitForRedisReady, connectRedis } = await import('../shared/lib/redis.js');
const client = hoisted.instance as FakeClient;

beforeEach(() => {
  client.status = 'wait';
  vi.restoreAllMocks();
});

describe('redis readiness helpers', () => {
  it('reports readiness from the client status', () => {
    expect(isRedisReady()).toBe(false);
    client.status = 'ready';
    expect(isRedisReady()).toBe(true);
  });

  it('resolves immediately when the client is already ready', async () => {
    client.status = 'ready';
    await expect(waitForRedisReady(50)).resolves.toBeUndefined();
  });

  it('starts an idle client and resolves once it becomes ready', async () => {
    const connect = vi.spyOn(client, 'connect');
    const waiting = waitForRedisReady(1_000);
    expect(connect).toHaveBeenCalledTimes(1);
    client.status = 'ready';
    client.emit('ready');
    await expect(waiting).resolves.toBeUndefined();
  });

  it('rejects when the client never becomes ready', async () => {
    client.status = 'reconnecting';
    await expect(waitForRedisReady(20)).rejects.toThrow(/Redis not ready/);
  });

  it('connectRedis resolves only once the client is ready', async () => {
    client.status = 'ready';
    await expect(connectRedis(50)).resolves.toBeUndefined();
  });
});
