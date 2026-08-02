import { apiClient } from '@/shared/lib/api-client';

interface DailyRewardStatus {
  canClaim: boolean;
  streak: number;
  nextRewardDay: number;
  nextReward: { xpAmount: number; coinAmount: number } | null;
  claimedToday: boolean;
}

interface ClaimResult {
  xpEarned: number;
  coinsEarned: number;
  streak: number;
}

function dataOf<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

export const dailyRewardApi = {
  status: (): Promise<DailyRewardStatus> =>
    apiClient
      .get<{ data: DailyRewardStatus }>('/player/daily-reward')
      .then(dataOf<DailyRewardStatus>),

  claim: (): Promise<ClaimResult> =>
    apiClient.post<{ data: ClaimResult }>('/player/daily-reward/claim').then(dataOf<ClaimResult>),
};
