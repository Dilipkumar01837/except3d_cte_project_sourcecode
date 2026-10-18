import { describe, expect, it } from 'vitest';
import {
  chooseAdaptiveHintType,
  fallbackHint,
  looksLikeFullSolution,
} from '../modules/challenges/ai-hint.service.js';

describe('adaptive hint selection', () => {
  it('starts beginners with conceptual hints', () => {
    expect(chooseAdaptiveHintType(1, 0)).toBe('CONCEPTUAL');
  });

  it('escalates advanced learners who are stuck to debugging hints', () => {
    expect(chooseAdaptiveHintType(4, 3)).toBe('DEBUGGING');
  });

  it('honors an explicit requested hint type', () => {
    expect(chooseAdaptiveHintType(1, 0, 'EXAMPLE')).toBe('EXAMPLE');
  });

  it('uses a targeted local fallback for off-by-one errors', () => {
    expect(
      fallbackHint({ hintType: 'DIRECTIONAL', sourceCode: '', errorPattern: 'OFF_BY_ONE' }),
    ).toContain('loop bounds');
  });
});

describe('solution guardrail', () => {
  it('flags a long fenced code block as a leaked full solution', () => {
    const code = Array.from({ length: 12 }, (_v, i) => `value${String(i)} = ${String(i)}`).join(
      '\n',
    );
    expect(looksLikeFullSolution(`Here is my attempt:\n\`\`\`python\n${code}\n\`\`\``)).toBe(true);
  });

  it('allows a short illustrative snippet', () => {
    expect(looksLikeFullSolution('Compare with:\n```python\nif n < 2:\n    return 1\n```')).toBe(
      false,
    );
  });

  it('flags an explicit complete-solution preamble', () => {
    expect(looksLikeFullSolution('Sure! Here is the complete solution for you.')).toBe(true);
  });

  it('leaves ordinary prose hints alone', () => {
    expect(looksLikeFullSolution('Check the loop bounds and trace the first iteration.')).toBe(
      false,
    );
  });
});
