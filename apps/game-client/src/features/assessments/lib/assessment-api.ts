import { apiClient } from '@/shared/lib/api-client';

export interface Assessment {
  id: string;
  worldId: string | null;
  levelId: string | null;
  type: 'PRE' | 'POST';
  title: string;
  description: string | null;
  questions: Array<{
    id: string;
    kind: string;
    prompt: string;
    options: string[] | null;
    points: number;
    objective: string | null;
    sortOrder: number;
  }>;
  attempts: Array<{
    score: number;
    maxScore: number;
    timeTakenMs: number;
    attemptNumber: number;
    completedAt: string;
  }>;
}
function data<T>(response: { data: { data: T } }): T {
  return response.data.data;
}
export const assessmentApi = {
  list: (worldId?: string, type?: 'PRE' | 'POST') =>
    apiClient
      .get('/learning/assessments', { params: { worldId, type } })
      .then(data<{ assessments: Assessment[] }>)
      .then((result) => result.assessments),
  submit: (assessmentId: string, responses: Record<string, unknown>, timeTakenMs: number) =>
    apiClient
      .post(`/learning/assessments/${assessmentId}/attempts`, { responses, timeTakenMs })
      .then(data<{ attempt: { score: number; maxScore: number; timeTakenMs: number } }>)
      .then((result) => result.attempt),
};
