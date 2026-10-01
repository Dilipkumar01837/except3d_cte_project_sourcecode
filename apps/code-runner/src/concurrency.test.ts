import { describe, expect, it } from 'vitest';
import { Semaphore } from './concurrency.js';

/** Lets queued microtasks run so waiters can be observed. */
function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('Semaphore', () => {
  it('admits up to max without queueing', async () => {
    const semaphore = new Semaphore({ max: 2, maxQueue: 10 });
    const a = await semaphore.acquire();
    const b = await semaphore.acquire();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(semaphore.inFlight).toBe(2);
    expect(semaphore.queued).toBe(0);
  });

  it('queues beyond max instead of admitting', async () => {
    const semaphore = new Semaphore({ max: 1, maxQueue: 5 });
    const first = await semaphore.acquire();
    expect(first).not.toBeNull();
    let admitted = false;
    const pending = semaphore.acquire().then((release) => {
      admitted = true;
      return release;
    });
    await flush();
    expect(admitted).toBe(false);
    expect(semaphore.queued).toBe(1);
    first?.();
    const second = await pending;
    expect(second).not.toBeNull();
    expect(semaphore.inFlight).toBe(1);
  });

  it('rejects with null once the queue is full', async () => {
    const semaphore = new Semaphore({ max: 1, maxQueue: 1 });
    const running = await semaphore.acquire();
    expect(running).not.toBeNull();
    // Fills the single queue slot. The promise is intentionally not awaited: the
    // call synchronously enqueues before it resolves.
    void semaphore.acquire();
    await flush();
    expect(semaphore.queued).toBe(1);
    // One more would exceed maxQueue.
    await expect(semaphore.acquire()).resolves.toBeNull();
  });

  it('rejects immediately when no waiting is allowed', async () => {
    const semaphore = new Semaphore({ max: 1, maxQueue: 0 });
    const running = await semaphore.acquire();
    expect(running).not.toBeNull();
    await expect(semaphore.acquire()).resolves.toBeNull();
  });

  it('preserves capacity when release is called twice', async () => {
    const semaphore = new Semaphore({ max: 1, maxQueue: 5 });
    const release = await semaphore.acquire();
    expect(release).not.toBeNull();
    release?.();
    release?.(); // double release must not free a second slot
    expect(semaphore.inFlight).toBe(0);
    const again = await semaphore.acquire();
    expect(again).not.toBeNull();
    expect(semaphore.inFlight).toBe(1);
  });

  it('serves waiters in arrival order', async () => {
    const semaphore = new Semaphore({ max: 1, maxQueue: 5 });
    const running = await semaphore.acquire();
    const order: string[] = [];
    const first = semaphore.acquire().then((release) => {
      order.push('first');
      return release;
    });
    const second = semaphore.acquire().then((release) => {
      order.push('second');
      return release;
    });
    await flush();
    running?.();
    const firstRelease = await first;
    firstRelease?.();
    await second;
    expect(order).toEqual(['first', 'second']);
  });

  it('rejects invalid limits rather than silently mis-capping', () => {
    expect(() => new Semaphore({ max: 0, maxQueue: 1 })).toThrow(/positive integer/);
    expect(() => new Semaphore({ max: 1.5, maxQueue: 1 })).toThrow(/positive integer/);
    expect(() => new Semaphore({ max: 1, maxQueue: -1 })).toThrow(/non-negative/);
  });
});
