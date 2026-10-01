import { describe, expect, it } from 'vitest';
import {
  reachablePercent,
  resolveLevelAccess,
  type LevelState,
} from '../modules/worlds/escape-room.js';

function level(
  number: number,
  options: { completed?: boolean; lock?: LevelState['lock'] } = {},
): LevelState {
  return {
    id: `level-${String(number)}`,
    number,
    isCompleted: options.completed ?? false,
    lock: options.lock ?? null,
  };
}

function lockedBy(keyId: string, slug = keyId, title = `Key ${keyId}`): LevelState['lock'] {
  return {
    title: 'Locked door',
    prompt: 'A door with a keyhole.',
    requiresKeyId: keyId,
    requiresKeySlug: slug,
    requiresKeyTitle: title,
  };
}

describe('resolveLevelAccess', () => {
  it('opens the first level of a world', () => {
    const result = resolveLevelAccess([level(1)], new Set());
    expect(result.get('level-1')?.access).toBe('OPEN');
  });

  it('gates later levels on the level before them', () => {
    const levels = [level(1), level(2)];
    const result = resolveLevelAccess(levels, new Set());
    expect(result.get('level-1')?.access).toBe('OPEN');
    expect(result.get('level-2')?.access).toBe('SEQUENTIAL');
  });

  it('opens the next level once the previous one is complete', () => {
    const levels = [level(1, { completed: true }), level(2)];
    const result = resolveLevelAccess(levels, new Set());
    expect(result.get('level-2')?.access).toBe('OPEN');
  });

  it('locks a level whose key the player does not hold', () => {
    const levels = [level(1), level(2, { lock: lockedBy('bronze', 'bronze-key') })];
    const result = resolveLevelAccess(levels, new Set());
    const resolution = result.get('level-2');
    expect(resolution?.access).toBe('LOCKED');
    expect(resolution?.missingKeySlug).toBe('bronze-key');
    expect(resolution?.lock?.title).toBe('Locked door');
  });

  it('opens a locked level when the player holds the key, skipping ahead', () => {
    const levels = [level(1), level(2), level(3, { lock: lockedBy('bronze', 'bronze-key') })];
    // Nothing else is done; the key alone gets them through.
    const result = resolveLevelAccess(levels, new Set(['bronze']));
    expect(result.get('level-3')?.access).toBe('OPEN');
    expect(result.get('level-3')?.missingKeySlug).toBeNull();
  });

  it('does not confuse keys from different worlds', () => {
    const levels = [level(1, { lock: lockedBy('bronze') })];
    const result = resolveLevelAccess(levels, new Set(['silver']));
    expect(result.get('level-1')?.access).toBe('LOCKED');
  });

  it('opens a lock that requires no key', () => {
    const levels = [
      level(1, { completed: true }),
      level(2, {
        lock: {
          title: 'Open door',
          prompt: 'Not really a door.',
          requiresKeyId: null,
          requiresKeySlug: null,
          requiresKeyTitle: null,
        },
      }),
    ];
    const result = resolveLevelAccess(levels, new Set());
    expect(result.get('level-2')?.access).toBe('OPEN');
  });

  it('treats a completed level as open regardless of its lock', () => {
    const levels = [level(1, { completed: true, lock: lockedBy('bronze') })];
    const result = resolveLevelAccess(levels, new Set());
    expect(result.get('level-1')?.access).toBe('OPEN');
    expect(result.get('level-1')?.missingKeySlug).toBeNull();
  });

  it('still reports the lock on a completed level so the UI can show it', () => {
    const levels = [level(1, { completed: true, lock: lockedBy('bronze') })];
    const result = resolveLevelAccess(levels, new Set());
    expect(result.get('level-1')?.lock).not.toBeNull();
  });

  it('returns an empty map for a world with no levels', () => {
    expect(resolveLevelAccess([], new Set()).size).toBe(0);
  });

  it('rejects unsorted levels rather than gating on the wrong predecessor', () => {
    expect(() => resolveLevelAccess([level(3), level(1)], new Set())).toThrow(/ordered by number/);
  });

  it('rejects duplicate level numbers', () => {
    expect(() => resolveLevelAccess([level(1), level(1)], new Set())).toThrow(/ordered by number/);
  });
});

describe('reachablePercent', () => {
  it('is zero for a world with no levels', () => {
    expect(reachablePercent(new Map())).toBe(0);
  });

  it('counts only open levels', () => {
    const levels = [level(1), level(2), level(3), level(4)];
    const result = resolveLevelAccess(levels, new Set());
    // Only level 1 is open; 2 and 3 are sequential, 4 follows 3.
    expect(reachablePercent(result)).toBe(25);
  });

  it('rises as keys are collected', () => {
    const levels = [level(1), level(2, { lock: lockedBy('bronze') })];
    expect(reachablePercent(resolveLevelAccess(levels, new Set()))).toBe(50);
    expect(reachablePercent(resolveLevelAccess(levels, new Set(['bronze'])))).toBe(100);
  });

  it('rounds to a whole percentage', () => {
    const levels = [level(1), level(2), level(3)];
    expect(reachablePercent(resolveLevelAccess(levels, new Set()))).toBe(33);
  });
});
