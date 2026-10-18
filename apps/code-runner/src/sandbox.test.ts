import { describe, expect, it } from 'vitest';
import { containerWatchdogMs, sandboxRunArgs } from './sandbox.js';

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

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

describe('sandboxRunArgs', () => {
  const cidFile = '/tmp/cte-runner/container-id';
  const args = sandboxRunArgs({ memoryLimitMb: 128 }, cidFile);

  it('runs with no network so the program cannot phone home', () => {
    expect(flagValue(args, '--network')).toBe('none');
  });

  it('mounts the root filesystem read-only with writable space only at /work and /tmp', () => {
    expect(args).toContain('--read-only');
    const tmpfs = args.filter((_, index) => args[index - 1] === '--tmpfs');
    expect(tmpfs).toEqual([
      '/work:rw,exec,mode=1777,size=64m',
      '/tmp:rw,noexec,nosuid,nodev,mode=1777,size=16m',
    ]);
  });

  it('drops all capabilities and blocks privilege escalation', () => {
    expect(flagValue(args, '--cap-drop')).toBe('ALL');
    expect(flagValue(args, '--security-opt')).toBe('no-new-privileges');
  });

  it('caps processes to blunt fork bombs', () => {
    expect(flagValue(args, '--pids-limit')).toBe('64');
  });

  it('applies the requested memory and swap ceilings', () => {
    const custom = sandboxRunArgs({ memoryLimitMb: 256 }, cidFile);
    expect(flagValue(custom, '--memory')).toBe('256m');
    expect(flagValue(custom, '--memory-swap')).toBe('256m');
    expect(flagValue(args, '--memory')).toBe('128m');
    expect(flagValue(args, '--memory-swap')).toBe('128m');
  });

  it('limits cpu usage', () => {
    expect(flagValue(args, '--cpus')).toBe('0.5');
  });

  it('runs the container as an unprivileged user', () => {
    expect(flagValue(args, '--user')).toBe('65534:65534');
  });

  it('removes the container on exit and ends with the sandbox image', () => {
    expect(args).toContain('--rm');
    expect(flagValue(args, '--cidfile')).toBe(cidFile);
    const expectedImage = process.env['CODE_RUNNER_IMAGE'] ?? 'code-to-escape/sandbox:latest';
    expect(args[args.length - 1]).toBe(expectedImage);
  });
});
