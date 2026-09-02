import { describe, expect, it } from 'vitest';
import '../config/index.js';

interface ExecuteResult {
  healthOk: boolean;
  status: number;
  body: {
    status?: string;
    results?: Array<{ testCaseId: string; passed: boolean; output?: string }>;
    compilerOutput?: string;
    runtimeOutput?: string;
  };
}

const runnerUrl = process.env['CODE_RUNNER_URL'] ?? 'http://localhost:3002';
const runnerToken = process.env['CODE_RUNNER_TOKEN'] ?? 'code-to-escape-dev-runner-token';
const headers = {
  authorization: `Bearer ${runnerToken}`,
  'content-type': 'application/json',
};

async function runnerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${runnerUrl}/health`, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function execute(payload: Record<string, unknown>): Promise<ExecuteResult> {
  try {
    const res = await fetch(`${runnerUrl}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    return {
      healthOk: true,
      status: res.status,
      body: (await res.json()) as ExecuteResult['body'],
    };
  } catch {
    return { healthOk: false, status: 0, body: {} };
  }
}

const base = {
  language: 'PYTHON',
  timeLimitMs: 2000,
  memoryLimitMb: 128,
};

describe.skipIf(!(await runnerAvailable()))(
  'Judge regression — runner contract (requires the sandbox runner on :3002)',
  () => {
    it('rejects requests without a valid token', async () => {
      const res = await fetch(`${runnerUrl}/execute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...base,
          sourceCode: 'print(1)',
          testCases: [{ id: 'a', input: '', expectedOutput: '1' }],
        }),
      });
      expect(res.status).toBe(401);
    });

    it('accepts a correct solution across all tests', async () => {
      const { status, body } = await execute({
        ...base,
        sourceCode: 'a=int(input())\nb=int(input())\nprint(a+b)\n',
        testCases: [
          { id: 't1', input: '2\n3\n', expectedOutput: '5\n' },
          { id: 't2', input: '10\n5\n', expectedOutput: '15\n' },
          { id: 't3', input: '-2\n-3\n', expectedOutput: '-5\n' },
        ],
      });
      expect(status).toBe(200);
      expect(body.status).toBe('ACCEPTED');
      expect(body.results?.every((result) => result.passed)).toBe(true);
    });

    it('reports WRONG_ANSWER with a result for every test case', async () => {
      const { body } = await execute({
        ...base,
        sourceCode: 'a=int(input())\nb=int(input())\nprint(a*b)\n',
        testCases: [
          { id: 't1', input: '2\n3\n', expectedOutput: '5\n' },
          { id: 't2', input: '10\n5\n', expectedOutput: '15\n' },
          { id: 't3', input: '0\n0\n', expectedOutput: '0\n' },
        ],
      });
      expect(body.status).toBe('WRONG_ANSWER');
      expect(body.results).toHaveLength(3);
      expect(body.results?.[0]?.passed).toBe(false);
      expect(body.results?.[1]?.passed).toBe(false);
      expect(body.results?.[2]?.passed).toBe(true);
    });

    it('records a failing result on compilation error', async () => {
      const { body } = await execute({
        language: 'JAVA',
        timeLimitMs: 10000,
        memoryLimitMb: 128,
        sourceCode:
          'class Main {\n  public static void main(String[] args) {\n    int x = ;\n    System.out.println(x);\n  }\n}\n',
        testCases: [{ id: 't1', input: '1\n', expectedOutput: '1' }],
      });
      expect(body.status).toBe('COMPILATION_ERROR');

      expect(typeof body.compilerOutput).toBe('string');
      expect(body.compilerOutput?.length ?? 0).toBeGreaterThan(0);
      expect(body.results).toHaveLength(1);
      expect(body.results?.[0]?.passed).toBe(false);
    });

    it('reports runtime errors with a failing test result', async () => {
      const { body } = await execute({
        ...base,
        sourceCode: 'x = 1 / 0\n',
        testCases: [{ id: 't1', input: '', expectedOutput: '1' }],
      });
      expect(['RUNTIME_ERROR', 'WRONG_ANSWER', 'INTERNAL_ERROR']).toContain(body.status);
      expect(body.results).toHaveLength(1);
      expect(body.results?.[0]?.passed).toBe(false);
    });

    it('reports TIME_LIMIT_EXCEEDED for an infinite loop', async () => {
      const { body } = await execute({
        ...base,
        timeLimitMs: 300,
        sourceCode: 'while True:\n    pass\n',
        testCases: [{ id: 't1', input: '', expectedOutput: 'done' }],
      });
      expect(body.status).toBe('TIME_LIMIT_EXCEEDED');
      expect(body.results?.[0]?.passed).toBe(false);
    });

    it('ignores line-ending differences (CRLF output still passes)', async () => {
      const { body } = await execute({
        ...base,
        sourceCode: 'print("hello")\n',
        testCases: [{ id: 't1', input: '', expectedOutput: 'hello\r\n' }],
      });
      expect(body.status).toBe('ACCEPTED');
    });

    it('ignores trailing whitespace per line and trailing blank lines', async () => {
      const { body } = await execute({
        ...base,
        sourceCode: 'print("line1   ")\nprint("line2")\nprint()\nprint()\n',
        testCases: [{ id: 't1', input: '', expectedOutput: 'line1\nline2\n' }],
      });
      expect(body.status).toBe('ACCEPTED');
    });

    it('still fails on interior single-space differences', async () => {
      const { body } = await execute({
        ...base,
        sourceCode: 'print("5 6")\n',
        testCases: [{ id: 't1', input: '', expectedOutput: '5  6' }],
      });
      expect(body.status).toBe('WRONG_ANSWER');
      expect(body.results?.[0]?.passed).toBe(false);
    });

    it('treats an empty program output as matching an empty expectation', async () => {
      const { body } = await execute({
        ...base,
        sourceCode: 'n = input()\n',
        testCases: [{ id: 't1', input: '2\n', expectedOutput: '' }],
      });
      expect(body.status).toBe('ACCEPTED');
    });

    it('rejects empty test arrays and oversized payloads', async () => {
      const noTests = await execute({ ...base, sourceCode: 'print(1)', testCases: [] });
      expect(noTests.status).toBe(400);

      const hugeInput = await execute({
        ...base,
        sourceCode: 'print(1)',
        testCases: [{ id: 't1', input: 'x'.repeat(70_000), expectedOutput: 'y' }],
      });
      expect(hugeInput.status).toBe(400);
    });
  },
);
