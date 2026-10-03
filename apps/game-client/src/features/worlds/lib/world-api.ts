import { apiClient } from '@/shared/lib/api-client';

export interface WorldProgress {
  isUnlocked: boolean;
  completionPercent: number;
  lastPlayedAt: string | null;
  completedAt: string | null;
}

export interface LevelProgress {
  isCompleted: boolean;
  /** Cosmetic discovery flag: the player has read this room's clue. */
  clueRead: boolean;
  stars: number;
  attempts: number;
  bestTimeSeconds: number | null;
  completedAt: string | null;
  lastPlayedAt: string | null;
}

export interface WorldSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: number;
  requiredXp: number;
  estimatedMinutes: number;
  imageUrl: string | null;
  progress: WorldProgress[];
  _count: { levels: number };
}

/** Server-computed access. `SEQUENTIAL` means clear the level before this one. */
export type LevelAccess = 'OPEN' | 'LOCKED' | 'SEQUENTIAL';

export interface LevelLock {
  id: string;
  title: string;
  prompt: string;
  requiresKeyId: string | null;
  requiresKey: { slug: string; title: string } | null;
}

export interface WorldLevel {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  previewUrl: string | null;
  challenge: { slug: string; title: string } | null;
  /** The key this level awards when cleared, if any. */
  grantsRoomKey: { slug: string; title: string } | null;
  progress: LevelProgress[];
  guardedByRoomLock: LevelLock | null;
  isCompleted: boolean;
  access: LevelAccess;
  /** Slug of the key still needed when the level is LOCKED. */
  missingKeySlug: string | null;
}

export interface RoomKeyView {
  id: string;
  slug: string;
  title: string;
  artKey: string | null;
  isHeld: boolean;
}

export interface WorldDetail extends WorldSummary {
  levels: WorldLevel[];
  roomKeys: RoomKeyView[];
  /** Share of levels currently reachable, 0-100. */
  reachablePercent: number;
}

function dataOf<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const worldApi = {
  async list(): Promise<WorldSummary[]> {
    return dataOf<{ worlds: WorldSummary[] }>(await apiClient.get('/player/worlds')).worlds;
  },
  async getLevels(worldId: string): Promise<WorldDetail> {
    return dataOf<{ world: WorldDetail }>(
      await apiClient.get(`/player/worlds/${encodeURIComponent(worldId)}/levels`),
    ).world;
  },
  /** Marks a room's clue as discovered. Cosmetic only; grants no progression. */
  async recordDiscovery(levelId: string): Promise<void> {
    await apiClient.post(`/player/levels/${encodeURIComponent(levelId)}/discovery`);
  },
};
