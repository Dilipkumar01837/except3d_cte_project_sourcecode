export const supportedLanguages = [
  'PYTHON',
  'JAVA',
  'JAVASCRIPT',
  'TYPESCRIPT',
  'CPP',
  'GO',
  'RUST',
] as const;
export type ProgrammingLanguage = (typeof supportedLanguages)[number];
export type ExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface ExecutionTestCase {
  id: string;
  input: string;
  expectedOutput: string;
}
export interface ExecutionRequest {
  language: ProgrammingLanguage;
  sourceCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: ExecutionTestCase[];
}
export interface TestResult {
  testCaseId: string;
  passed: boolean;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  output?: string;
}
export interface ExecutionResult {
  status: ExecutionStatus;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  compilerOutput?: string;
  runtimeOutput?: string;
  results: TestResult[];
}
