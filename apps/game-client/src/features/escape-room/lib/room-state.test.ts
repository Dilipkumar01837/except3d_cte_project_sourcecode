import { describe, expect, it } from 'vitest';
import type { LevelProgress, WorldLevel } from '@/features/worlds/lib/world-api';
import { deriveRoomState, hasReadClue, isRoomPlayable } from './room-state';

function progress(overrides: Partial<LevelProgress> = {}): LevelProgress {
  return {
    isCompleted: false,
    clueRead: false,
    stars: 0,
    attempts: 0,
    bestTimeSeconds: null,
    completedAt: null,
    lastPlayedAt: null,
    ...overrides,
  };
}

function level(overrides: Partial<WorldLevel> = {}): WorldLevel {
  return {
    id: 'level-1',
    number: 1,
    title: 'First Clearing',
    description: '',
    difficulty: 1,
    xpReward: 50,
    previewUrl: null,
    challenge: { slug: 'python-sum-two-numbers', title: 'Sum Two Numbers' },
    grantsRoomKey: null,
    progress: [],
    guardedByRoomLock: null,
    isCompleted: false,
    access: 'OPEN',
    missingKeySlug: null,
    ...overrides,
  };
}

describe('room-state', () => {
  it('treats open and completed rooms as playable', () => {
    expect(isRoomPlayable(level())).toBe(true);
    expect(isRoomPlayable(level({ access: 'SEQUENTIAL' }))).toBe(false);
    expect(isRoomPlayable(level({ access: 'LOCKED' }))).toBe(false);
    expect(isRoomPlayable(level({ access: 'LOCKED', isCompleted: true }))).toBe(true);
  });

  it('reads clue discovery from progress rows', () => {
    expect(hasReadClue(level())).toBe(false);
    expect(hasReadClue(level({ progress: [progress({ clueRead: true })] }))).toBe(true);
  });

  it('derives objectives from server state', () => {
    expect(deriveRoomState(level()).objectives.map((objective) => objective.done)).toEqual([
      false,
      false,
      false,
    ]);

    const cleared = deriveRoomState(
      level({ isCompleted: true, progress: [progress({ isCompleted: true, clueRead: true })] }),
    );
    expect(cleared.isCompleted).toBe(true);
    expect(cleared.objectives.every((objective) => objective.done)).toBe(true);
  });
});
