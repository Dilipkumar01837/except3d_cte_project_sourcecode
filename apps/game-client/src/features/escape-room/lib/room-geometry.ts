/**
 * Pure 2D movement and collision maths for the escape-room canvas.
 *
 * The room is a fixed-size coordinate space; the player is an axis-aligned box
 * and obstacles are axis-aligned rectangles. Everything here is a pure function
 * so the tricky part — sliding along walls instead of sticking — is unit tested
 * without a browser.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The player's bounding box centred on `center`. */
export function playerBox(center: Vec2, half: number): Rect {
  return { x: center.x - half, y: center.y - half, width: half * 2, height: half * 2 };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** True when the player centred at `center` touches any obstacle. */
export function collides(center: Vec2, half: number, obstacles: readonly Rect[]): boolean {
  const box = playerBox(center, half);
  return obstacles.some((obstacle) => rectsOverlap(box, obstacle));
}

/**
 * Moves the player by `delta`, clamping to the room and blocking obstacles.
 *
 * Each axis is resolved independently so a diagonal push against a wall slides
 * along it rather than stopping the player dead.
 */
export function moveWithCollision(
  position: Vec2,
  delta: Vec2,
  half: number,
  bounds: Bounds,
  obstacles: readonly Rect[],
): Vec2 {
  const maxX = bounds.width - half;
  const maxY = bounds.height - half;

  let x = position.x;
  let y = position.y;

  const nextX = clamp(x + delta.x, half, maxX);
  if (!collides({ x: nextX, y }, half, obstacles)) x = nextX;

  const nextY = clamp(y + delta.y, half, maxY);
  if (!collides({ x, y: nextY }, half, obstacles)) y = nextY;

  return { x, y };
}

/** Converts a room-space measurement into a CSS percentage of the given total. */
export function percent(value: number, total: number): string {
  return `${String((value / total) * 100)}%`;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** True when `player` is within `radius` world units of `target`. */
export function isWithin(player: Vec2, target: Vec2, radius: number): boolean {
  return distance(player, target) <= radius;
}
