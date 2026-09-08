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
  ): Promise<{ content: string; xpPenalty: number; alreadyRevealed: boolean }> {
    return dataOf<{ hint: { content: string; xpPenalty: number; alreadyRevealed: boolean } }>(
      await apiClient.get(`/challenges/${encodeURIComponent(slug)}/hints/${String(level)}`),
    ).hint;
  },
  async aiHint(slug: string, language: Language, sourceCode: string): Promise<string> {
    return dataOf<{ hint: string }>(
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
  ): Promise<AiErrorHint> {
    return dataOf<{ hint: AiErrorHint }>(
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
};
