import { describe, expect, it } from 'vitest';
import {
  clamp,
  collides,
  isWithin,
  moveWithCollision,
  playerBox,
  rectsOverlap,
} from './room-geometry';

describe('room-geometry', () => {
  const bounds = { width: 1000, height: 600 };
  const half = 16;

  it('clamps a value into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('detects overlapping rectangles', () => {
    expect(
      rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }),
    ).toBe(true);
    expect(
      rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 }),
    ).toBe(false);
  });

  it('keeps the player inside the room', () => {
    expect(moveWithCollision({ x: 10, y: 10 }, { x: -100, y: -100 }, half, bounds, [])).toEqual({
      x: half,
      y: half,
    });
    expect(moveWithCollision({ x: 990, y: 590 }, { x: 100, y: 100 }, half, bounds, [])).toEqual({
      x: bounds.width - half,
      y: bounds.height - half,
    });
  });

  it('blocks movement into an obstacle but slides along it', () => {
    const wall = { x: 200, y: 0, width: 40, height: 600 };
    expect(moveWithCollision({ x: 180, y: 300 }, { x: 40, y: 0 }, half, bounds, [wall])).toEqual({
      x: 180,
      y: 300,
    });
    const slide = moveWithCollision({ x: 180, y: 300 }, { x: 40, y: 50 }, half, bounds, [wall]);
    expect(slide.x).toBe(180);
    expect(slide.y).toBe(350);
  });

  it('reports proximity to a target', () => {
    expect(isWithin({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
    expect(isWithin({ x: 0, y: 0 }, { x: 6, y: 8 }, 5)).toBe(false);
  });

  it('computes a centred player box', () => {
    expect(playerBox({ x: 50, y: 50 }, 10)).toEqual({ x: 40, y: 40, width: 20, height: 20 });
  });

  it('detects when the player box touches an obstacle', () => {
    expect(collides({ x: 210, y: 300 }, half, [{ x: 216, y: 0, width: 20, height: 600 }])).toBe(
      true,
    );
    expect(collides({ x: 100, y: 100 }, half, [{ x: 216, y: 0, width: 20, height: 600 }])).toBe(
      false,
    );
  });
});
