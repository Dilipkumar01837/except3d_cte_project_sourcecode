import { describe, expect, it } from 'vitest';
import { chooseAdaptiveHintType, fallbackHint } from '../modules/challenges/ai-hint.service.js';

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
