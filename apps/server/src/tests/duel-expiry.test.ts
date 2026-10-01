import { describe, expect, it } from 'vitest';
import {
  activeDuelCutoff,
  openDuelCutoff,
  type DuelWindows,
} from '../modules/duels/duel-expiry.js';

const windows: DuelWindows = { openMs: 24 * 60 * 60 * 1000, activeMs: 30 * 60 * 1000 };

describe('duel expiry windows', () => {
  it('subtracts the open window from the reference time', () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    expect(openDuelCutoff(now, windows).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('subtracts the active window from the reference time', () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    expect(activeDuelCutoff(now, windows).toISOString()).toBe('2026-01-01T23:30:00.000Z');
  });

  it('keeps the open and active clocks distinct', () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    // A lobby open window must be far longer than the active duel window,
    // otherwise a duel could be abandoned before anyone joins.
    expect(openDuelCutoff(now, windows).getTime()).toBeLessThan(
      activeDuelCutoff(now, windows).getTime(),
    );
  });

  it('does not mutate the reference time', () => {
    const now = new Date('2026-01-02T00:00:00.000Z');
    const before = now.getTime();
    openDuelCutoff(now, windows);
    activeDuelCutoff(now, windows);
    expect(now.getTime()).toBe(before);
  });
});
