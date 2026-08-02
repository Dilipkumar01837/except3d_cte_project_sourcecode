import { supportedLanguages, type ExecutionRequest } from './contracts.js';

const MAX_SOURCE_BYTES = 100_000;
const MAX_TESTS = 128;
const MAX_INPUT_BYTES = 64_000;

export function validateExecutionRequest(value: unknown): ExecutionRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.language !== 'string' ||
    !supportedLanguages.includes(body.language as (typeof supportedLanguages)[number])
  )
    return null;
  if (
    typeof body.sourceCode !== 'string' ||
    Buffer.byteLength(body.sourceCode) === 0 ||
    Buffer.byteLength(body.sourceCode) > MAX_SOURCE_BYTES
  )
    return null;
  if (
    !Number.isInteger(body.timeLimitMs) ||
    (body.timeLimitMs as number) < 50 ||
    (body.timeLimitMs as number) > 10_000
  )
    return null;
  if (
    !Number.isInteger(body.memoryLimitMb) ||
    (body.memoryLimitMb as number) < 16 ||
    (body.memoryLimitMb as number) > 512
  )
    return null;
  if (
    !Array.isArray(body.testCases) ||
    body.testCases.length === 0 ||
    body.testCases.length > MAX_TESTS
  )
    return null;
  const testCases = body.testCases.map((item) => {
    if (typeof item !== 'object' || item === null) return null;
    const testCase = item as Record<string, unknown>;
    if (
      typeof testCase.id !== 'string' ||
      typeof testCase.input !== 'string' ||
      typeof testCase.expectedOutput !== 'string' ||
      Buffer.byteLength(testCase.input) > MAX_INPUT_BYTES ||
      Buffer.byteLength(testCase.expectedOutput) > MAX_INPUT_BYTES
    )
      return null;
    return { id: testCase.id, input: testCase.input, expectedOutput: testCase.expectedOutput };
  });
  if (testCases.some((item) => item === null)) return null;
  return {
    language: body.language as ExecutionRequest['language'],
    sourceCode: body.sourceCode,
    timeLimitMs: body.timeLimitMs as number,
    memoryLimitMb: body.memoryLimitMb as number,
    testCases: testCases as ExecutionRequest['testCases'],
  };
}
