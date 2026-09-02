import { apiClient } from '@/shared/lib/api-client';
import type { Language, Submission } from '@/features/challenges/lib/challenge-api';

export interface Duel {
  id: string;
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  challenge: { id: string; slug: string; title: string };
  creator: { id: string; username: string };
  opponent: { id: string; username: string } | null;
}

function dataOf<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const duelApi = {
  async list(): Promise<Duel[]> {
    return dataOf<{ duels: Duel[] }>(await apiClient.get('/duels')).duels;
  },
  async create(challengeId: string): Promise<Duel> {
    return dataOf<{ duel: Duel }>(await apiClient.post('/duels', { challengeId })).duel;
  },
  async join(duelId: string): Promise<Duel> {
    return dataOf<{ duel: Duel }>(await apiClient.post(`/duels/${encodeURIComponent(duelId)}/join`))
      .duel;
  },
  async get(duelId: string): Promise<Duel> {
    return dataOf<{ duel: Duel }>(await apiClient.get(`/duels/${encodeURIComponent(duelId)}`)).duel;
  },
  async submit(duelId: string, language: Language, sourceCode: string): Promise<Submission> {
    return dataOf<{ submission: Submission }>(
      await apiClient.post(`/duels/${encodeURIComponent(duelId)}/submissions`, {
        language,
        sourceCode,
      }),
    ).submission;
  },
};
