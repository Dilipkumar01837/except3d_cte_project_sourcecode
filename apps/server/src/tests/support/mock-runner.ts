/**
 * Explicit test double for the sandbox code runner.
 *
 * The production judge (judge-execution.ts) never fabricates a verdict. When the
 * runner is unreachable it throws JudgeServiceError, which is the honest outcome.
 * Tests that need to exercise the HTTP contract around judging must therefore
 * opt in explicitly by installing this stub. It is never activated implicitly
 * by NODE_ENV, so a green test suite can no longer be produced by fake judging.
 *
 * The stub does not execute code. It returns exactly the verdict the test
 * declares, so tests assert how the API surfaces a runner result, not that the
 * runner judged anything. Real judging is covered by judging.test.ts, which
 * requires a live sandbox and is skipped when none is present.
 */

type RunnerVerdict =
  'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';

interface StubOptions {
  status: RunnerVerdict;
  /** Per-test-case stdout, keyed by test case id. */
  outputByTestCaseId?: Record<string, string>;
  compilerOutput?: string;
  runtimeOutput?: string;
  /**
   * When false, only the first test case fails and the rest pass. Defaults to
   * true, which is the realistic shape of a wrong or broken solution and keeps
   * tests from asserting a partial pass that a real judge would not produce.
   */
  failAllTestCases?: boolean;
}

const originalFetch = globalThis.fetch;

/** Installs the stub. Returns a restore function. */
export function stubRunner(options: StubOptions): () => void {
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as { url: string }).url;
    if (!url.includes('/execute')) return originalFetch(input, init);

    const body = init?.body;
    const payload = JSON.parse(typeof body === 'string' ? body : '{}') as {
      testCases: Array<{ id: string }>;
    };
    const outputByTestCaseId = options.outputByTestCaseId ?? {};
    const failAll = options.failAllTestCases ?? true;
    const failing = options.status === 'ACCEPTED' ? null : (payload.testCases[0]?.id ?? 'stub');

    return new Response(
      JSON.stringify({
        status: options.status,
        executionTimeMs: 12,
        memoryUsedKb: 2048,
        compilerOutput: options.compilerOutput,
        runtimeOutput: options.runtimeOutput,
        results: payload.testCases.map((testCase) => ({
          testCaseId: testCase.id,
          passed: failing === null || (!failAll && testCase.id !== failing),
          executionTimeMs: 12,
          memoryUsedKb: 2048,
          output: outputByTestCaseId[testCase.id] ?? (failing === testCase.id ? 'wrong' : 'ok'),
        })),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

/** Restores fetch after a suite that used stubRunner. */
export function restoreRunner(): void {
  globalThis.fetch = originalFetch;
}
