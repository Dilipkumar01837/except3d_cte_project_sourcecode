/**
 * Escape-room lock and key resolution.
 *
 * Kept pure and separate from the controller so the rules can be unit tested
 * without a database, and so the same rules can be reused by an admin preview or
 * a future 3D renderer without duplicating the gate conditions.
 *
 * The model is deliberately small:
 *   - A *level* is reachable when the player has cleared what stands in front of it.
 *   - A *lock* on a level is a door. If it names a key the player holds, the door
 *     is open and they may skip straight to that level.
 *   - Without a lock, the gate is simply sequential: clear the level before.
 *
 * Keys therefore have real value: they let a player skip ahead rather than only
 * ever solving in order.
 */

export type LevelAccess = 'OPEN' | 'LOCKED' | 'SEQUENTIAL';

export interface LockState {
  title: string;
  prompt: string;
  requiresKeyId: string | null;
  requiresKeySlug: string | null;
  requiresKeyTitle: string | null;
}

export interface LevelState {
  id: string;
  number: number;
  isCompleted: boolean;
  lock: LockState | null;
}

export interface AccessResolution {
  access: LevelAccess;
  /** Present when a lock is blocking the level. */
  lock: LockState | null;
  /** Slug of the key the player still needs, when a lock requires one. */
  missingKeySlug: string | null;
}

/** Key slugs the player holds, passed as ids because that is what a lock stores. */
export type HeldKeyIds = ReadonlySet<string>;

/**
 * Levels must arrive ordered by `number` ascending. The sequential gate depends
 * on the preceding level, so ordering is part of the contract rather than an
 * assumption the caller is trusted to have got right.
 */
function assertOrdered(levels: readonly LevelState[]): void {
  for (let i = 1; i < levels.length; i += 1) {
    const previous = levels[i - 1];
    const current = levels[i];
    if (previous !== undefined && current !== undefined && previous.number >= current.number) {
      throw new Error(
        `Levels must be ordered by number ascending; got ${String(previous.number)} before ${String(
          current.number,
        )}`,
      );
    }
  }
}

export function resolveLevelAccess(
  levels: readonly LevelState[],
  heldKeyIds: HeldKeyIds,
): Map<string, AccessResolution> {
  assertOrdered(levels);

  const resolved = new Map<string, AccessResolution>();

  levels.forEach((level, index) => {
    // Already finished, so the gate is irrelevant. The lock is still reported:
    // the UI shows "you solved this door", which is worth knowing.
    if (level.isCompleted) {
      resolved.set(level.id, { access: 'OPEN', lock: level.lock, missingKeySlug: null });
      return;
    }

    const lock = level.lock;

    if (lock) {
      if (lock.requiresKeyId === null) {
        // A door with nothing to collect behind it: open.
        resolved.set(level.id, { access: 'OPEN', lock, missingKeySlug: null });
        return;
      }
      if (heldKeyIds.has(lock.requiresKeyId)) {
        resolved.set(level.id, { access: 'OPEN', lock, missingKeySlug: null });
        return;
      }
      resolved.set(level.id, {
        access: 'LOCKED',
        lock,
        missingKeySlug: lock.requiresKeySlug,
      });
      return;
    }

    // No lock: the gate is the level before this one.
    const previous = index > 0 ? levels[index - 1] : undefined;
    if (previous === undefined || previous.isCompleted) {
      resolved.set(level.id, { access: 'OPEN', lock: null, missingKeySlug: null });
      return;
    }
    resolved.set(level.id, { access: 'SEQUENTIAL', lock: null, missingKeySlug: null });
  });

  return resolved;
}

/** Percentage of a world's levels the player can currently reach. */
export function reachablePercent(resolutions: ReadonlyMap<string, AccessResolution>): number {
  if (resolutions.size === 0) return 0;
  let open = 0;
  for (const resolution of resolutions.values()) {
    if (resolution.access === 'OPEN') open += 1;
  }
  return Math.round((open / resolutions.size) * 100);
}
