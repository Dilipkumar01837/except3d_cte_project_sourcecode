import type { ProgrammingLanguage } from '@prisma/client';
import type { JudgeExecutionResult, RunnerStatus } from './judge-execution.js';

export type ExecutionDiagnosticStatus = Extract<
  RunnerStatus,
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
>;

export interface ExecutionDiagnostic {
  status: ExecutionDiagnosticStatus;
  errorType: string;
  message: string;
  rawOutput?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  language: ProgrammingLanguage;
  testCaseId?: string;
}

const MAX_MESSAGE_LENGTH = 2_000;

function cleanMessage(value: string): string {
  return value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function locationsFor(
  language: ProgrammingLanguage,
  output: string,
): Array<{
  line?: number;
  column?: number;
}> {
  const patterns: RegExp[] =
    language === 'PYTHON'
      ? [/File "[^"]+", line (\d+)/, /line (\d+)/i]
      : language === 'JAVASCRIPT' || language === 'TYPESCRIPT'
        ? [/:(\d+):(\d+)/, /line (\d+)/i]
        : language === 'CPP' || language === 'GO' || language === 'RUST'
          ? [/(?:solution|main|[^\s:]+)\.(?:cpp|cc|c|go|rs):(\d+)(?::(\d+))?/i]
          : [/\.(?:java):?(\d+)(?::(\d+))?/i, /line (\d+)/i];

  const locations: Array<{ line?: number; column?: number }> = [];
  for (const pattern of patterns) {
    const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`);
    for (const match of output.matchAll(globalPattern)) {
      const line = Number(match[1]);
      if (!Number.isInteger(line) || line < 1) continue;
      if (
        !locations.some(
          (location) =>
            location.line === line && location.column === (match[2] ? Number(match[2]) : undefined),
        )
      ) {
        locations.push({ line, column: match[2] ? Number(match[2]) : undefined });
      }
    }
  }
  return locations;
}

function typeFor(status: ExecutionDiagnosticStatus, output: string): string {
  if (status === 'COMPILATION_ERROR' && /syntaxerror/i.test(output)) return 'SyntaxError';
  if (status === 'RUNTIME_ERROR') {
    const match = /(?:^|\n)([A-Za-z]+Error):/.exec(output);
    if (match?.[1]) return match[1];
  }
  if (status === 'WRONG_ANSWER') return 'Wrong Answer';
  if (status === 'TIME_LIMIT_EXCEEDED') return 'Time Limit Exceeded';
  if (status === 'MEMORY_LIMIT_EXCEEDED') return 'Memory Limit Exceeded';
  if (status === 'INTERNAL_ERROR') return 'Internal Error';
  return 'Compilation Error';
}

function messageFor(status: ExecutionDiagnosticStatus, output: string): string {
  if (status === 'WRONG_ANSWER') return 'The output did not match the expected output.';
  if (status === 'TIME_LIMIT_EXCEEDED') return 'The program exceeded the allowed execution time.';
  if (status === 'MEMORY_LIMIT_EXCEEDED') return 'The program exceeded the allowed memory limit.';
  if (status === 'INTERNAL_ERROR') return 'The execution service could not complete this run.';
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return cleanMessage(
    lines.find((line) => /(?:Error|error|expected|panic|fatal)/.test(line)) ?? output,
  );
}

export function parseExecutionDiagnostics(
  language: ProgrammingLanguage,
  result: JudgeExecutionResult,
): ExecutionDiagnostic[] {
  if (result.status === 'ACCEPTED') return [];
  const status: ExecutionDiagnosticStatus = result.status;
  const output = (result.compilerOutput ?? result.runtimeOutput ?? '').trim();
  const diagnostics: ExecutionDiagnostic[] = [];
  if (status === 'WRONG_ANSWER') {
    for (const item of result.results.filter((entry) => !entry.passed)) {
      diagnostics.push({
        status,
        errorType: 'Wrong Answer',
        message: messageFor(status, ''),
        language,
        testCaseId: item.testCaseId,
        rawOutput: item.output?.slice(0, MAX_MESSAGE_LENGTH),
      });
    }
    return diagnostics;
  }
  const locations = locationsFor(language, output);
  const shared = {
    status,
    errorType: typeFor(status, output),
    message: messageFor(status, output),
    rawOutput: output.slice(0, MAX_MESSAGE_LENGTH) || undefined,
    language,
  } satisfies Omit<ExecutionDiagnostic, 'line' | 'column' | 'endLine' | 'endColumn'>;
  if (locations.length === 0) diagnostics.push(shared);
  else for (const location of locations) diagnostics.push({ ...shared, ...location });
  return diagnostics;
}
