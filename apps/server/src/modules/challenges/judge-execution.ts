import { env } from '../../config/index.js';
import type { ProgrammingLanguage } from '@prisma/client';
import { parseExecutionDiagnostics, type ExecutionDiagnostic } from './execution-diagnostics.js';

export type RunnerStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface ExecutedTestResult {
  testCaseId: string;
  passed: boolean;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  output?: string;
}

export interface JudgeExecutionResult {
  status: RunnerStatus;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  compilerOutput?: string;
  runtimeOutput?: string;
  results: ExecutedTestResult[];
  diagnostics?: ExecutionDiagnostic[];
}

export interface JudgeExecutionInput {
  language: string;
  sourceCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{ id: string; input: string; expectedOutput: string }>;
}

export const TERMINAL_RUNNER_STATUSES = new Set<RunnerStatus>([
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILATION_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
]);

const MAX_RUNNER_TEXT_BYTES = 64_000;

/** Throwable when the runner cannot be reached or returns a malformed payload. */
export class JudgeServiceError extends Error {}

/**
 * Treat the runner as an untrusted internal dependency: validate and bound
 * every value it returns. Rejects test-case ids the caller did not permit so a
 * compromised or buggy runner can never leak data it was not asked about.
 */
export function validateJudgeResult(
  value: unknown,
  permittedTestCaseIds: ReadonlySet<string>,
): JudgeExecutionResult | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.status !== 'string' ||
    !TERMINAL_RUNNER_STATUSES.has(body.status as RunnerStatus) ||
    !Array.isArray(body.results)
  )
    return null;
  const text = (input: unknown): string | undefined =>
    typeof input === 'string' ? input.slice(0, MAX_RUNNER_TEXT_BYTES) : undefined;
  const metric = (input: unknown): number | undefined =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0
      ? Math.floor(input)
      : undefined;
  const seen = new Set<string>();
  const results: ExecutedTestResult[] = [];
  for (const item of body.results) {
    if (typeof item !== 'object' || item === null) return null;
    const result = item as Record<string, unknown>;
    if (
      typeof result.testCaseId !== 'string' ||
      !permittedTestCaseIds.has(result.testCaseId) ||
      seen.has(result.testCaseId) ||
      typeof result.passed !== 'boolean'
    )
      return null;
    seen.add(result.testCaseId);
    results.push({
      testCaseId: result.testCaseId,
      passed: result.passed,
      executionTimeMs: metric(result.executionTimeMs),
      memoryUsedKb: metric(result.memoryUsedKb),
      output: text(result.output),
    });
  }
  return {
    status: body.status as RunnerStatus,
    executionTimeMs: metric(body.executionTimeMs),
    memoryUsedKb: metric(body.memoryUsedKb),
    compilerOutput: text(body.compilerOutput),
    runtimeOutput: text(body.runtimeOutput),
    results,
  };
}

/** Runs code against the sandbox runner. Throws JudgeServiceError on transport/contract failure. */
export async function executeWithRunner(input: JudgeExecutionInput): Promise<JudgeExecutionResult> {
  let response: Response;
  try {
    response = await fetch(`${env.codeRunnerUrl}/execute`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.codeRunnerToken}`,
      },
      body: JSON.stringify({
        language: input.language,
        sourceCode: input.sourceCode,
        timeLimitMs: input.timeLimitMs,
        memoryLimitMb: input.memoryLimitMb,
        testCases: input.testCases,
      }),
      signal: AbortSignal.timeout(input.timeLimitMs * input.testCases.length + 30_000),
    });
  } catch (error) {
    // Transport failure is never papered over with a synthetic verdict.
    // Tests must inject a fetch stub; production must surface the failure.
    throw new JudgeServiceError(
      error instanceof Error ? error.message : 'Execution service unavailable',
    );
  }
  if (!response.ok) throw new JudgeServiceError(`Runner returned ${String(response.status)}`);
  const validated = validateJudgeResult(
    await response.json(),
    new Set(input.testCases.map((testCase) => testCase.id)),
  );
  if (!validated) throw new JudgeServiceError('Runner returned an invalid execution result');
  return {
    ...validated,
    diagnostics: parseExecutionDiagnostics(input.language as ProgrammingLanguage, validated),
  };
}
