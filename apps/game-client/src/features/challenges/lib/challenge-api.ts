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
/** The room a challenge belongs to, present only when it is bound to a level. */
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
  isCompleted: boolean;
  access: 'OPEN' | 'LOCKED' | 'SEQUENTIAL';
  missingKeySlug: string | null;
  lock: ChallengeRoomLock | null;
  grantsKeyTitle: string | null;
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
  /** Null for standalone challenges (Explore list, duels). */
  gameLevelContext: ChallengeRoom | null;
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
export interface TestResult {
  testCaseId: string;
  passed: boolean;
  executionTimeMs?: number | null;
  memoryUsedKb?: number | null;
  output?: string | null;
}
export interface RunResult {
  status: string;
  executionTimeMs?: number | null;
  memoryUsedKb?: number | null;
  compilerOutput?: string | null;
  runtimeOutput?: string | null;
  results: TestResult[];
  diagnostics?: ExecutionDiagnostic[];
}
export type ExecutionDiagnosticStatus =
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';
export interface ExecutionDiagnostic {
  status: ExecutionDiagnosticStatus;
  errorType: string;
  message: string;
  rawOutput?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  language: Language;
  testCaseId?: string;
}
export interface AiErrorHint {
  explanation: string;
  hint: string;
  suggestedFix?: string;
}
export interface HintOutcome {
  resolvedAfter: boolean;
  helpful: boolean | null;
}
export interface HintQuota {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}
export interface AiHintResult extends HintOutcome {
  hint: string;
  hintId: string;
  quota: HintQuota;
}
export interface AiErrorHintResult extends HintOutcome, AiErrorHint {
  hintId: string;
  quota: HintQuota;
}
export interface SubmissionDetail extends Submission {
  compilerOutput: string | null;
  runtimeOutput: string | null;
  results: Array<TestResult & { testCase: { isHidden: boolean } }>;
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
  async run(slug: string, language: Language, sourceCode: string): Promise<RunResult> {
    return dataOf<{ run: RunResult }>(
      await apiClient.post(`/challenges/${encodeURIComponent(slug)}/runs`, {
        language,
        sourceCode,
      }),
    ).run;
  },
  async submissions(slug: string): Promise<Submission[]> {
    return dataOf<{ submissions: Submission[] }>(
      await apiClient.get(`/challenges/${encodeURIComponent(slug)}/submissions`),
    ).submissions;
  },
  async submissionDetails(slug: string, submissionId: string): Promise<SubmissionDetail> {
    return dataOf<{ submission: SubmissionDetail }>(
      await apiClient.get(
        `/challenges/${encodeURIComponent(slug)}/submissions/${encodeURIComponent(submissionId)}`,
      ),
    ).submission;
  },
  async hint(
    slug: string,
    level: number,
  ): Promise<{ content: string; xpPenalty: number; alreadyRevealed: boolean } & HintOutcome> {
    return dataOf<{
      hint: { content: string; xpPenalty: number; alreadyRevealed: boolean } & HintOutcome;
    }>(await apiClient.get(`/challenges/${encodeURIComponent(slug)}/hints/${String(level)}`)).hint;
  },
  async aiHint(slug: string, language: Language, sourceCode: string): Promise<AiHintResult> {
    return dataOf<{ hint: AiHintResult }>(
      await apiClient.post(`/challenges/${encodeURIComponent(slug)}/hints/ai`, {
        language,
        sourceCode,
      }),
    ).hint;
  },
  async aiErrorHint(
    slug: string,
    language: Language,
    sourceCode: string,
    diagnostic: ExecutionDiagnostic,
  ): Promise<AiErrorHintResult> {
    return dataOf<{ hint: AiErrorHintResult }>(
      await apiClient.post(`/challenges/${encodeURIComponent(slug)}/hints/ai-error`, {
        language,
        sourceCode,
        errorType: diagnostic.errorType,
        errorMessage: diagnostic.message,
        line: diagnostic.line,
        column: diagnostic.column,
      }),
    ).hint;
  },
  async aiHintFeedback(slug: string, hintId: string, helpful: boolean): Promise<void> {
    await apiClient.post(
      `/challenges/${encodeURIComponent(slug)}/hints/ai/${encodeURIComponent(hintId)}/feedback`,
      { helpful },
    );
  },
  async hintFeedback(slug: string, level: number, helpful: boolean): Promise<void> {
    await apiClient.post(
      `/challenges/${encodeURIComponent(slug)}/hints/${String(level)}/feedback`,
      { helpful },
    );
  },
};
