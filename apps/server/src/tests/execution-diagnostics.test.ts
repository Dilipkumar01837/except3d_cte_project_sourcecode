import { describe, expect, it } from 'vitest';
import type { ProgrammingLanguage } from '@prisma/client';
import { parseExecutionDiagnostics } from '../modules/challenges/execution-diagnostics.js';
import type { JudgeExecutionResult } from '../modules/challenges/judge-execution.js';

function parse(
  language: ProgrammingLanguage,
  status: JudgeExecutionResult['status'],
  output: string,
) {
  return parseExecutionDiagnostics(language, {
    status,
    compilerOutput: status === 'COMPILATION_ERROR' ? output : undefined,
    runtimeOutput: status === 'RUNTIME_ERROR' ? output : undefined,
    results: [{ testCaseId: 'case-1', passed: false, output }],
  })[0];
}

describe('execution diagnostic parsing', () => {
  it('returns no diagnostics for an accepted execution', () => {
    expect(
      parseExecutionDiagnostics('PYTHON', {
        status: 'ACCEPTED',
        results: [{ testCaseId: 'case-1', passed: true, output: '42' }],
      }),
    ).toEqual([]);
  });

  it('parses Python syntax locations', () => {
    expect(
      parse(
        'PYTHON',
        'COMPILATION_ERROR',
        'File "solution.py", line 10\nSyntaxError: invalid syntax',
      ),
    ).toMatchObject({
      errorType: 'SyntaxError',
      line: 10,
      message: 'SyntaxError: invalid syntax',
    });
  });

  it('parses JavaScript runtime locations', () => {
    expect(
      parse(
        'JAVASCRIPT',
        'RUNTIME_ERROR',
        'ReferenceError: x is not defined\n at solution (solution.js:12:5)',
      ),
    ).toMatchObject({
      errorType: 'ReferenceError',
      line: 12,
      column: 5,
    });
  });

  it('parses TypeScript locations', () => {
    expect(
      parse(
        'TYPESCRIPT',
        'COMPILATION_ERROR',
        'solution.ts:7:9 - error TS2304: Cannot find name x',
      ),
    ).toMatchObject({
      line: 7,
      column: 9,
    });
  });

  it.each([
    ['CPP', 'solution.cpp:15:12: error: expected ;', 15, 12],
    ['GO', 'solution.go:8:3: undefined: total', 8, 3],
    ['RUST', 'solution.rs:4:7: error: cannot find value', 4, 7],
    ['JAVA', 'Solution.java:18: error: ; expected', 18, undefined],
  ] as const)('parses %s compiler locations', (language, output, line, column) => {
    expect(parse(language, 'COMPILATION_ERROR', output)).toMatchObject({ line, column });
  });

  it('returns multiple diagnostics and preserves missing locations', () => {
    const result = parseExecutionDiagnostics('CPP', {
      status: 'COMPILATION_ERROR',
      compilerOutput: 'solution.cpp:5:2: error: first\nsolution.cpp:9:4: error: second',
      results: [],
    });
    expect(result).toHaveLength(2);
    expect(result.map((item) => [item.line, item.column])).toEqual([
      [5, 2],
      [9, 4],
    ]);
    const missingLocation = parse('PYTHON', 'RUNTIME_ERROR', 'unclear failure');
    expect(missingLocation).toMatchObject({ message: 'unclear failure' });
    expect(missingLocation).not.toHaveProperty('line');
    expect(missingLocation).not.toHaveProperty('column');
  });

  it('creates one diagnostic per wrong-answer test without exposing expected output', () => {
    const result = parseExecutionDiagnostics('PYTHON', {
      status: 'WRONG_ANSWER',
      results: [
        { testCaseId: 'one', passed: false, output: '42' },
        { testCaseId: 'two', passed: true, output: '45' },
      ],
    });
    expect(result).toHaveLength(1);
    const first = result[0];
    if (!first) throw new Error('Expected a wrong-answer diagnostic');
    expect(first).toMatchObject({ testCaseId: 'one', errorType: 'Wrong Answer' });
    expect(first.message).not.toContain('45');
  });
});
