/**
 * Resolves the escape-room a challenge lives in.
 *
 * A challenge is only part of a room when it is bound to a published GameLevel.
 * Standalone challenges (the Explore list, duel challenges) are not gated by any
 * door and resolve to `null`. When a challenge *is* bound, this returns the same
 * access verdict the level map shows, computed from the shared `resolveLevelAccess`
 * rules so the door on the map and the door on the API can never disagree.
 */

import { prisma } from '../../shared/lib/prisma.js';
import {
  resolveLevelAccess,
  type AccessResolution,
  type LevelState,
  type LockState,
} from './escape-room.js';

export interface ChallengeRoomLock {
  title: string;
  prompt: string;
  requiresKeySlug: string | null;
  requiresKeyTitle: string | null;
}

export interface ChallengeRoom {
  worldId: string;
  worldSlug: string;
  worldName: string;
  levelId: string;
  levelNumber: number;
  levelTitle: string;
  levelDescription: string;
  /** True when the player has already cleared this room. */
  isCompleted: boolean;
  access: AccessResolution['access'];
  /** Slug of the key still needed when `access` is `LOCKED`. */
  missingKeySlug: string | null;
  lock: ChallengeRoomLock | null;
  /** Title of the key this room awards when solved, if any. */
  grantsKeyTitle: string | null;
}

function toLockState(
  lock: {
    title: string;
    prompt: string;
    requiresKeyId: string | null;
    requiresKey: { slug: string; title: string } | null;
  } | null,
): LockState | null {
  if (!lock) return null;
  return {
    title: lock.title,
    prompt: lock.prompt,
    requiresKeyId: lock.requiresKeyId,
    requiresKeySlug: lock.requiresKey?.slug ?? null,
    requiresKeyTitle: lock.requiresKey?.title ?? null,
  };
}

/**
 * Returns the room context for a challenge, or `null` when the challenge is not
 * bound to a published level (and is therefore freely playable).
 */
export async function resolveChallengeRoom(
  userId: string,
  challengeId: string,
): Promise<ChallengeRoom | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      gameLevel: {
        select: {
          id: true,
          worldId: true,
          number: true,
          title: true,
          description: true,
          isPublished: true,
        },
      },
    },
  });
  const level = challenge?.gameLevel;
  if (!level || !level.isPublished) return null;

  const world = await prisma.gameWorld.findUnique({
    where: { id: level.worldId },
    select: {
      id: true,
      slug: true,
      name: true,
      isPublished: true,
      levels: {
        where: { isPublished: true },
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          progress: { where: { userId }, select: { isCompleted: true } },
          guardedByRoomLock: {
            select: {
              title: true,
              prompt: true,
              isPublished: true,
              requiresKeyId: true,
              requiresKey: { select: { slug: true, title: true } },
            },
          },
        },
      },
      roomKeys: {
        where: { isPublished: true },
        select: { id: true, holders: { where: { userId }, select: { id: true } } },
      },
    },
  });
  // An unpublished world should not gate a challenge either: treat it as free.
  if (!world || !world.isPublished) return null;

  const heldKeyIds = new Set(
    world.roomKeys.filter((key) => key.holders.length > 0).map((key) => key.id),
  );

  const levelStates: LevelState[] = world.levels.map((entry) => {
    const publishedLock =
      entry.guardedByRoomLock && entry.guardedByRoomLock.isPublished
        ? entry.guardedByRoomLock
        : null;
    return {
      id: entry.id,
      number: entry.number,
      isCompleted: entry.progress.some((progress) => progress.isCompleted),
      lock: toLockState(publishedLock),
    };
  });

  const target = world.levels.find((entry) => entry.id === level.id);
  const resolution = target ? resolveLevelAccess(levelStates, heldKeyIds).get(level.id) : undefined;
  if (!target || !resolution) return null;

  const grantedKey = await prisma.roomKey.findFirst({
    where: { grantedByLevelId: level.id, isPublished: true },
    select: { title: true },
  });

  return {
    worldId: world.id,
    worldSlug: world.slug,
    worldName: world.name,
    levelId: level.id,
    levelNumber: level.number,
    levelTitle: level.title,
    levelDescription: level.description,
    isCompleted: target.progress.some((progress) => progress.isCompleted),
    access: resolution.access,
    missingKeySlug: resolution.missingKeySlug,
    lock: resolution.lock
      ? {
          title: resolution.lock.title,
          prompt: resolution.lock.prompt,
          requiresKeySlug: resolution.lock.requiresKeySlug,
          requiresKeyTitle: resolution.lock.requiresKeyTitle,
        }
      : null,
    grantsKeyTitle: grantedKey?.title ?? null,
  };
}
