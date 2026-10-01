/**
 * Bounded concurrency for sandbox executions.
 *
 * Each `/execute` request spawns one Docker container per test case, sequentially.
 * With no cap, a burst of submissions spawns unbounded containers and exhausts
 * host CPU and memory — the failure mode is the whole machine, not just the
 * runner. This limits how many requests execute at once and how many may wait.
 *
 * Requests beyond `maxQueue` are rejected rather than queued forever: a caller
 * that gets a fast 503 can retry, whereas one parked behind a 500-deep queue
 * just holds an HTTP connection until `requestTimeout` kills it.
 */

export interface SemaphoreLimits {
  /** Executions allowed to run at the same time. */
  max: number;
  /** Executions allowed to wait. Requests beyond this are rejected. */
  maxQueue: number;
}

export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limits: SemaphoreLimits) {
    if (!Number.isInteger(limits.max) || limits.max < 1) {
      throw new Error(`Semaphore max must be a positive integer, got ${String(limits.max)}`);
    }
    if (!Number.isInteger(limits.maxQueue) || limits.maxQueue < 0) {
      throw new Error(
        `Semaphore maxQueue must be a non-negative integer, got ${String(limits.maxQueue)}`,
      );
    }
  }

  get inFlight(): number {
    return this.active;
  }

  get queued(): number {
    return this.waiting.length;
  }

  /**
   * Resolves with a release function, or `null` when the queue is full and the
   * caller should shed load. The release function is idempotent so a double call
   * cannot inflate capacity.
   */
  acquire(): Promise<(() => void) | null> {
    if (this.active < this.limits.max) {
      this.active += 1;
      return Promise.resolve(this.makeRelease());
    }
    if (this.waiting.length >= this.limits.maxQueue) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      this.waiting.push(() => {
        this.active += 1;
        resolve(this.makeRelease());
      });
    });
  }

  private makeRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      const next = this.waiting.shift();
      if (next) next();
    };
  }
}
