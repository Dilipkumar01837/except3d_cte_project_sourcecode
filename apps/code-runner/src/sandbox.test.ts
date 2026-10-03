import { describe, expect, it } from 'vitest';
import { containerWatchdogMs } from './sandbox.js';

// The outer watchdog must never be tight enough that Docker cold-start is
// mistaken for a timeout. On Windows Docker Desktop a cold container start can
// take ~5-10s, so a valid submission with a small programming limit would be
// killed by an `timeLimitMs + 2_000` watchdog before the program even ran.
const MIN_CONTAINER_WATCHDOG_MS = 30_000;
const MAX_CONTAINER_WATCHDOG_MS = 120_000;

describe('containerWatchdogMs', () => {
  it('gives a small time limit the full minimum startup allowance', () => {
    expect(containerWatchdogMs(2_000)).toBeGreaterThanOrEqual(MIN_CONTAINER_WATCHDOG_MS);
    expect(containerWatchdogMs(10_000)).toBeGreaterThanOrEqual(MIN_CONTAINER_WATCHDOG_MS);
  });

  it('is larger than the legacy timeLimit + 2000 watchdog that caused false TLEs', () => {
    for (const timeLimitMs of [50, 500, 2_000, 10_000, 30_000]) {
      expect(containerWatchdogMs(timeLimitMs)).toBeGreaterThan(timeLimitMs + 2_000);
    }
  });

  it('adds startup and compile budget to a large time limit', () => {
    expect(containerWatchdogMs(30_000)).toBeGreaterThanOrEqual(60_000);
  });

  it('is monotonic non-decreasing in the time limit', () => {
    const limits = [50, 100, 2_000, 10_000, 30_000];
    for (let i = 1; i < limits.length; i += 1) {
      expect(containerWatchdogMs(limits[i] as number)).toBeGreaterThanOrEqual(
        containerWatchdogMs(limits[i - 1] as number),
      );
    }
  });

  it('never exceeds the hard upper safety bound', () => {
    for (const timeLimitMs of [0, 2_000, 30_000, 1_000_000]) {
      expect(containerWatchdogMs(timeLimitMs)).toBeLessThanOrEqual(MAX_CONTAINER_WATCHDOG_MS);
    }
  });
});
