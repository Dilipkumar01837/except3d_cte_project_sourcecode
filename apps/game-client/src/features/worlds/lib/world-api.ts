import { apiClient } from '@/shared/lib/api-client';

export interface WorldProgress {
  isUnlocked: boolean;
  completionPercent: number;
  lastPlayedAt: string | null;
  completedAt: string | null;
}

export interface LevelProgress {
  isCompleted: boolean;
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

export interface WorldLevel {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  previewUrl: string | null;
  challenge: { slug: string; title: string } | null;
  progress: LevelProgress[];
}

export interface WorldDetail extends WorldSummary {
  levels: WorldLevel[];
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
};
