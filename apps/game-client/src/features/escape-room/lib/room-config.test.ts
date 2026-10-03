import { describe, expect, it } from 'vitest';
import { resolveRoomConfig } from './room-config';

describe('room-config', () => {
  it('returns bespoke configs for the Python Forest rooms', () => {
    const room = resolveRoomConfig('python-forest', 1, 'First Clearing');
    expect(room.key).toBe('python-forest:1');
    expect(room.title).toBe('First Clearing');
    expect(room.objects.map((entry) => entry.kind)).toEqual(['clue', 'terminal', 'door']);
  });

  it('falls back to a generated room for worlds without a config', () => {
    const room = resolveRoomConfig('java-lake', 1, 'Shallows');
    expect(room.key).toBe('java-lake:1');
    expect(room.title).toBe('Shallows');
    expect(room.theme.id).toBe('java-lake');
    expect(room.objects).toHaveLength(3);
  });

  it('keeps every object fully inside the room bounds', () => {
    for (const [slug, number, title] of [
      ['python-forest', 1, 'First Clearing'],
      ['python-forest', 2, 'Split Path'],
      ['python-forest', 3, 'High Ridge'],
    ] as const) {
      const room = resolveRoomConfig(slug, number, title);
      for (const entry of room.objects) {
        expect(entry.x - entry.width / 2).toBeGreaterThanOrEqual(0);
        expect(entry.x + entry.width / 2).toBeLessThanOrEqual(room.bounds.width);
        expect(entry.y - entry.height / 2).toBeGreaterThanOrEqual(0);
        expect(entry.y + entry.height / 2).toBeLessThanOrEqual(room.bounds.height);
      }
    }
  });
});
