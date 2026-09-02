import { apiClient } from '@/shared/lib/api-client';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  myRank: { rank: number; xp: number } | null;
  type: 'global' | 'weekly';
}

function dataOf<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const leaderboardApi = {
  async list(type: 'global' | 'weekly'): Promise<LeaderboardResponse> {
    return dataOf<LeaderboardResponse>(
      await apiClient.get('/player/leaderboard', { params: { type, limit: 50 } }),
    );
  },
};
