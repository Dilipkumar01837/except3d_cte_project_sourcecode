import { apiClient } from './api-client';

// ─── Types ────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile: {
    displayName: string;
    level: number;
    xp: number;
    rank: string;
    coins?: number;
    codingStreak?: number;
  } | null;
}

export interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalChallenges: number;
  publishedChallenges: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  successRate: number;
  totalWorlds: number;
  publishedWorlds: number;
  totalLevels: number;
  totalAchievements: number;
  recentUsers: AdminUser[];
  recentSubmissions: Array<{
    id: string;
    status: string;
    score: number;
    createdAt: string;
    user: { username: string };
    challenge: { title: string; slug: string };
  }>;
}

export interface AdminChallenge {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: string;
  tags: string[];
  supportedLanguages: string[];
  xpReward: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  isPublished: boolean;
  createdAt: string;
  statement?: string;
  constraints?: string | null;
  starterCode?: Record<string, string>;
  testCases?: ChallengeTestCase[];
  hints?: ChallengeHint[];
  _count?: { submissions: number; testCases: number };
}

export interface ChallengeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string | null;
  isHidden: boolean;
  weight: number;
  sortOrder: number;
}

export interface ChallengeHint {
  id: string;
  level: number;
  content: string;
  xpPenalty: number;
}

export interface AdminWorld {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: number;
  requiredXp: number;
  estimatedMinutes: number;
  isPublished: boolean;
  sortOrder: number;
  levels: AdminLevel[];
  _count: { levels: number };
}

export interface AdminLevel {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: number;
  xpReward: number;
  challengeId?: string | null;
  challenge?: { slug: string; title: string } | null;
  isPublished: boolean;
}

export interface AdminAchievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  target: number;
  xpReward: number;
  isHidden: boolean;
  isPublished: boolean;
  _count: { players: number };
}

export interface LearningAnalytics {
  from: string;
  to: string;
  worlds: Array<{
    worldId: string;
    worldName: string;
    pairedUsers: number;
    averageImprovement: number;
    medianImprovement: number;
    averageAssessmentTimeMs: number;
  }>;
  experimentVariants: Array<{ variant: string; users: number }>;
  hintEffectiveness?: {
    total: number;
    rated: number;
    helpfulRate: number;
    solveRate: number;
  };
}
export interface AdminScene {
  id: string;
  levelId: string;
  modelUrl: string | null;
  objects: unknown;
  settings: unknown;
  isPublished: boolean;
  level: { title: string; world: { name: string } };
}

function data<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

// ─── API functions ────────────────────────────────────────────────

export const adminApi = {
  getOverview: () => apiClient.get('/admin/overview').then(data<OverviewStats>),

  getLearningAnalytics: (params: {
    from?: string;
    to?: string;
    worldId?: string;
    experimentId?: string;
    variant?: string;
  }) => apiClient.get('/admin/analytics', { params }).then(data<LearningAnalytics>),
  getHintAnalytics: () =>
    apiClient
      .get('/admin/hints/analytics')
      .then(data<{ total: number; rated: number; helpfulRate: number; solveRate: number }>),
  exportLearningAnalytics: (params: { from?: string; to?: string; eventType?: string }) =>
    apiClient
      .get('/admin/analytics/export', { params, responseType: 'blob' })
      .then((response) => response.data as Blob),
  listExperiments: () =>
    apiClient.get('/admin/experiments').then(
      data<{
        experiments: Array<{
          id: string;
          key: string;
          name: string;
          isActive: boolean;
          variants: string[];
        }>;
      }>,
    ),
  createExperiment: (payload: {
    key: string;
    name: string;
    description?: string;
    variants: string[];
    isActive: boolean;
  }) =>
    apiClient
      .post('/admin/experiments', payload)
      .then(data<{ experiment: { id: string; key: string } }>),
  listScenes: () => apiClient.get('/admin/scenes').then(data<{ scenes: AdminScene[] }>),
  saveScene: (
    levelId: string,
    payload: { modelUrl?: string; objects: unknown; settings?: unknown; isPublished: boolean },
  ) => apiClient.put(`/admin/scenes/${levelId}`, payload).then(data<{ scene: AdminScene }>),

  listUsers: (params: { page?: number; limit?: number; search?: string; role?: string }) =>
    apiClient
      .get('/admin/users', { params })
      .then(data<{ users: AdminUser[]; total: number; page: number; limit: number }>),

  getUser: (id: string) =>
    apiClient
      .get(`/admin/users/${id}`)
      .then(data<{ user: AdminUser; submissionCount: number; achievementCount: number }>),

  updateUserRole: (id: string, role: string) =>
    apiClient.patch(`/admin/users/${id}/role`, { role }).then(data<{ message: string }>),

  suspendUser: (id: string, reason?: string) =>
    apiClient.post(`/admin/users/${id}/suspend`, { reason }).then(data<{ message: string }>),

  reactivateUser: (id: string) =>
    apiClient.post(`/admin/users/${id}/reactivate`).then(data<{ message: string }>),

  listChallenges: (params: {
    page?: number;
    limit?: number;
    search?: string;
    difficulty?: string;
  }) =>
    apiClient
      .get('/admin/challenges', { params })
      .then(data<{ challenges: AdminChallenge[]; total: number }>),

  getChallenge: (id: string) =>
    apiClient.get(`/admin/challenges/${id}`).then(data<{ challenge: AdminChallenge }>),

  createChallenge: (payload: Partial<AdminChallenge>) =>
    apiClient.post('/admin/challenges', payload).then(data<{ challenge: AdminChallenge }>),

  updateChallenge: (id: string, payload: Partial<AdminChallenge>) =>
    apiClient.patch(`/admin/challenges/${id}`, payload).then(data<{ challenge: AdminChallenge }>),

  deleteChallenge: (id: string) =>
    apiClient.delete(`/admin/challenges/${id}`).then(data<{ message: string }>),

  publishChallenge: (id: string) =>
    apiClient.post(`/admin/challenges/${id}/publish`).then(data<{ message: string }>),

  unpublishChallenge: (id: string) =>
    apiClient.post(`/admin/challenges/${id}/unpublish`).then(data<{ message: string }>),

  addTestCase: (challengeId: string, payload: Omit<ChallengeTestCase, 'id'>) =>
    apiClient
      .post(`/admin/challenges/${challengeId}/test-cases`, payload)
      .then(data<{ testCase: ChallengeTestCase }>),

  updateTestCase: (challengeId: string, tcId: string, payload: Partial<ChallengeTestCase>) =>
    apiClient
      .patch(`/admin/challenges/${challengeId}/test-cases/${tcId}`, payload)
      .then(data<{ testCase: ChallengeTestCase }>),

  deleteTestCase: (challengeId: string, tcId: string) =>
    apiClient
      .delete(`/admin/challenges/${challengeId}/test-cases/${tcId}`)
      .then(data<{ message: string }>),

  addHint: (challengeId: string, payload: Omit<ChallengeHint, 'id'>) =>
    apiClient
      .post(`/admin/challenges/${challengeId}/hints`, payload)
      .then(data<{ hint: ChallengeHint }>),

  updateHint: (challengeId: string, hintId: string, payload: Partial<ChallengeHint>) =>
    apiClient
      .patch(`/admin/challenges/${challengeId}/hints/${hintId}`, payload)
      .then(data<{ hint: ChallengeHint }>),

  deleteHint: (challengeId: string, hintId: string) =>
    apiClient
      .delete(`/admin/challenges/${challengeId}/hints/${hintId}`)
      .then(data<{ message: string }>),

  listWorlds: () => apiClient.get('/admin/worlds').then(data<{ worlds: AdminWorld[] }>),

  createWorld: (payload: Partial<AdminWorld>) =>
    apiClient.post('/admin/worlds', payload).then(data<{ world: AdminWorld }>),

  updateWorld: (id: string, payload: Partial<AdminWorld>) =>
    apiClient.patch(`/admin/worlds/${id}`, payload).then(data<{ world: AdminWorld }>),

  deleteWorld: (id: string) =>
    apiClient.delete(`/admin/worlds/${id}`).then(data<{ message: string }>),

  createLevel: (worldId: string, payload: Partial<AdminLevel>) =>
    apiClient.post(`/admin/worlds/${worldId}/levels`, payload).then(data<{ level: AdminLevel }>),

  updateLevel: (worldId: string, levelId: string, payload: Partial<AdminLevel>) =>
    apiClient
      .patch(`/admin/worlds/${worldId}/levels/${levelId}`, payload)
      .then(data<{ level: AdminLevel }>),

  deleteLevel: (worldId: string, levelId: string) =>
    apiClient.delete(`/admin/worlds/${worldId}/levels/${levelId}`).then(data<{ message: string }>),

  getSystemStatus: () =>
    apiClient.get('/admin/system').then(
      data<{
        services: Record<string, { ok: boolean; label: string }>;
        stats: {
          userCount: number;
          challengeCount: number;
          submissionCount: number;
          acceptedCount: number;
          successRate: number;
          recentSubmissionVolume: number;
          queuedCount: number;
        };
        queue: { depth: number };
        env: { nodeEnv: string; port: number; version: string };
        uptime: number;
      }>,
    ),

  listAchievements: () =>
    apiClient.get('/admin/achievements').then(data<{ achievements: AdminAchievement[] }>),

  createAchievement: (payload: Partial<AdminAchievement>) =>
    apiClient.post('/admin/achievements', payload).then(data<{ achievement: AdminAchievement }>),

  updateAchievement: (id: string, payload: Partial<AdminAchievement>) =>
    apiClient
      .patch(`/admin/achievements/${id}`, payload)
      .then(data<{ achievement: AdminAchievement }>),

  publishAchievement: (id: string) =>
    apiClient.post(`/admin/achievements/${id}/publish`).then(data<{ message: string }>),

  unpublishAchievement: (id: string) =>
    apiClient.post(`/admin/achievements/${id}/unpublish`).then(data<{ message: string }>),
};
