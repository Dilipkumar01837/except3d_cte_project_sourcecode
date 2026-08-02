import { apiClient } from '@/shared/lib/api-client';

export type Language = 'PYTHON' | 'JAVA' | 'JAVASCRIPT' | 'TYPESCRIPT' | 'CPP' | 'GO' | 'RUST';
export interface ChallengeSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: string;
  tags: string[];
  supportedLanguages: Language[];
  xpReward: number;
  timeLimitMs: number;
  memoryLimitMb: number;
}
export interface Challenge extends ChallengeSummary {
  statement: string;
  constraints: string | null;
  starterCode: Record<string, string>;
  testCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    explanation: string | null;
  }>;
  hints: Array<{ level: number; xpPenalty: number }>;
}
export interface Submission {
  id: string;
  language: Language;
  status: string;
  score: number;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  createdAt: string;
  completedAt: string | null;
}

function dataOf<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const challengeApi = {
  async list(): Promise<ChallengeSummary[]> {
    return dataOf<{ challenges: ChallengeSummary[] }>(await apiClient.get('/challenges'))
      .challenges;
  },
  async get(slug: string): Promise<Challenge> {
    return dataOf<{ challenge: Challenge }>(
      await apiClient.get(`/challenges/${encodeURIComponent(slug)}`),
    ).challenge;
  },
  async submit(slug: string, language: Language, sourceCode: string): Promise<Submission> {
    return dataOf<{ submission: Submission }>(
      await apiClient.post(`/challenges/${encodeURIComponent(slug)}/submissions`, {
        language,
        sourceCode,
      }),
    ).submission;
  },
  async submissions(slug: string): Promise<Submission[]> {
    return dataOf<{ submissions: Submission[] }>(
      await apiClient.get(`/challenges/${encodeURIComponent(slug)}/submissions`),
    ).submissions;
  },
  async hint(slug: string, level: number): Promise<{ content: string; xpPenalty: number }> {
    return dataOf<{ hint: { content: string; xpPenalty: number } }>(
      await apiClient.get(`/challenges/${encodeURIComponent(slug)}/hints/${String(level)}`),
    ).hint;
  },
};
