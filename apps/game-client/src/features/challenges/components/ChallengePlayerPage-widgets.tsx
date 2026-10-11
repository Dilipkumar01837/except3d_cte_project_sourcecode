/**
 * Small, stateless widgets and pure helper functions for the ChallengePlayerPage.
 *
 * Keeping these separate lets ChallengePlayerPage.tsx focus purely on state
 * management and data flow, making both files easier to navigate.
 *
 * Exports:
 *   HintFeedback      – thumbs-up / thumbs-down widget for AI and manual hints
 *   ResultRow         – single pass/fail row in the test-case results list
 *   statusTone        – CSS class for a submission status string
 *   diagnosticTitle   – human-readable title for a diagnostic status
 *   diagnosticTone    – CSS class for a diagnostic status string
 *   typeLabel         – human-readable label for a challenge type
 *   typeGuidance      – optional guidance paragraph for a challenge type
 */

// ─── HintFeedback ─────────────────────────────────────────────────────────────

export function HintFeedback({
  value,
  disabled,
  onVote,
}: {
  value: boolean | null;
  disabled?: boolean;
  onVote: (helpful: boolean) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
      <span>Was this helpful?</span>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value === true}
        onClick={() => {
          onVote(true);
        }}
        className={`rounded border px-2 py-0.5 transition-colors disabled:opacity-50 ${
          value === true
            ? 'border-emerald-400/60 text-emerald-300'
            : 'border-slate-700 hover:bg-slate-800'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value === false}
        onClick={() => {
          onVote(false);
        }}
        className={`rounded border px-2 py-0.5 transition-colors disabled:opacity-50 ${
          value === false
            ? 'border-rose-400/60 text-rose-300'
            : 'border-slate-700 hover:bg-slate-800'
        }`}
      >
        No
      </button>
      {value !== null && <span className="text-slate-500">Thanks</span>}
    </div>
  );
}

// ─── ResultRow ────────────────────────────────────────────────────────────────

export function ResultRow({
  label,
  passed,
  isHidden,
}: {
  label: string;
  passed: boolean;
  isHidden: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded bg-slate-800 px-3 py-1.5 text-xs">
      <span className={isHidden ? 'text-amber-300/90' : 'text-slate-300'}>{label}</span>
      <span className={passed ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-300'}>
        {passed ? 'PASSED' : 'FAILED'}
      </span>
    </div>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function statusTone(status: string): string {
  if (status === 'ACCEPTED') return 'text-emerald-400';
  if (
    [
      'WRONG_ANSWER',
      'COMPILATION_ERROR',
      'RUNTIME_ERROR',
      'TIME_LIMIT_EXCEEDED',
      'MEMORY_LIMIT_EXCEEDED',
      'INTERNAL_ERROR',
    ].includes(status)
  )
    return 'text-rose-300';
  return 'text-brand-500';
}

export function diagnosticTitle(status: string): string {
  return status.replaceAll('_', ' ');
}

export function diagnosticTone(status: string): string {
  return status === 'WRONG_ANSWER' ? 'text-amber-300' : 'text-rose-300';
}

const challengeTypeLabels: Record<string, string> = {
  ALGORITHMS: 'Algorithms',
  DATA_STRUCTURES: 'Data Structures',
  DEBUGGING: 'Debugging',
  OUTPUT_PREDICTION: 'Output Prediction',
  FILL_IN_THE_BLANK: 'Fill in the Blank',
  CODE_COMPLETION: 'Code Completion',
};

const challengeTypeGuidance: Record<string, string> = {
  DEBUGGING: 'The starter code contains a bug. Find and fix it, then submit.',
  OUTPUT_PREDICTION:
    'Work out what the snippet in the statement prints, then write code that produces it.',
  FILL_IN_THE_BLANK: 'Replace the gap marked with underscores so the program behaves as described.',
  CODE_COMPLETION: 'Complete the marked TODO so the program behaves as described.',
};

export function typeLabel(type: string): string {
  return challengeTypeLabels[type] ?? type.replaceAll('_', ' ');
}

export function typeGuidance(type: string): string | null {
  return challengeTypeGuidance[type] ?? null;
}
