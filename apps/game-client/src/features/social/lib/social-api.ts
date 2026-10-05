import { apiClient } from '@/shared/lib/api-client';
export interface SocialUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  profile: {
    displayName: string;
    bio: string | null;
    level: number;
    xp: number;
    rank: string;
  } | null;
  online?: boolean;
}
function data<T>(response: { data: { data: T } }): T {
  return response.data.data;
}
export const socialApi = {
  search: (q: string) =>
    apiClient
      .get('/social/search', { params: { q } })
      .then(data<{ users: SocialUser[] }>)
      .then((result) => result.users),
  friends: () =>
    apiClient
      .get('/social/friends')
      .then(data<{ friends: SocialUser[] }>)
      .then((result) => result.friends),
  requests: () =>
    apiClient
      .get('/social/requests')
      .then(data<{ requests: Array<{ id: string; sender: SocialUser }> }>)
      .then((result) => result.requests),
  sendRequest: (userId: string) => apiClient.post(`/social/requests/${userId}`),
  respond: (requestId: string, accept: boolean) =>
    apiClient.post(`/social/requests/${requestId}/${accept ? 'accept' : 'reject'}`),
  block: (userId: string) => apiClient.post(`/social/blocks/${userId}`),
  leaderboard: () =>
    apiClient
      .get('/social/leaderboard')
      .then(
        data<{
          leaderboard: Array<{
            userId: string;
            displayName: string;
            xp: number;
            level: number;
            rank: string;
          }>;
        }>,
      )
      .then((result) => result.leaderboard),
  quickMatch: (challengeId: string) =>
    apiClient
      .post('/social/matchmaking', { challengeId })
      .then(data<{ status: 'QUEUED' | 'MATCHED'; duelId?: string }>),
  cancelMatch: () => apiClient.delete('/social/matchmaking'),
};
