import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MonacoCodeEditor } from './MonacoCodeEditor';
import {
  challengeApi,
  type Challenge,
  type AiHintResult,
  type AiErrorHintResult,
  type ExecutionDiagnostic,
  type Language,
  type RunResult,
  type Submission,
  type SubmissionDetail,
} from '../lib/challenge-api';
import { trackEvent } from '@/shared/lib/telemetry';
import { worldApi, type WorldSummary } from '@/features/worlds/lib/world-api';

function HintFeedback({
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

const defaultCode: Record<Language, string> = {
  PYTHON: '# Write your solution here\n',
  JAVA: 'class Main {\n  public static void main(String[] args) {\n  }\n}\n',
  JAVASCRIPT: '// Write your solution here\n',
  TYPESCRIPT: '// Write your solution here\n',
  CPP: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {}\n',
  GO: 'package main\n\nfunc main() {}\n',
  RUST: 'fn main() {}\n',
};
const terminalStatuses = new Set([
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILATION_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
]);

function statusTone(status: string): string {
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

function diagnosticTitle(status: string): string {
  return status.replaceAll('_', ' ');
}

function diagnosticTone(status: string): string {
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

function typeLabel(type: string): string {
  return challengeTypeLabels[type] ?? type.replaceAll('_', ' ');
}

function typeGuidance(type: string): string | null {
  return challengeTypeGuidance[type] ?? null;
}

function ResultRow({
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

export function ChallengePlayerPage() {
  const { slug = '' } = useParams();
  const [challenge, setChallenge] = useState<Challenge>();
  const [language, setLanguage] = useState<Language>('PYTHON');
  const [code, setCode] = useState(defaultCode.PYTHON);
  const completedSubmissionsRef = useRef<Set<string>>(new Set());
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission>();
  const [detail, setDetail] = useState<SubmissionDetail>();
  const [run, setRun] = useState<RunResult>();
  const [diagnostics, setDiagnostics] = useState<ExecutionDiagnostic[]>([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<ExecutionDiagnostic>();
  const [aiErrorHint, setAiErrorHint] = useState<AiErrorHintResult>();
  const [loadingAiErrorHint, setLoadingAiErrorHint] = useState(false);
  const [aiErrorUnavailable, setAiErrorUnavailable] = useState(false);
  const [aiErrorVote, setAiErrorVote] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState<
    Record<number, { content: string; penalty: number; helpful?: boolean | null }>
  >({});
  const [revealingHint, setRevealingHint] = useState<number | null>(null);
  const [aiHint, setAiHint] = useState<AiHintResult>();
  const [aiHintVote, setAiHintVote] = useState<boolean | null>(null);
  const [loadingAiHint, setLoadingAiHint] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [roomProgress, setRoomProgress] = useState<{
    nextRoomSlug: string | null;
    worldComplete: boolean;
    nextWorld: WorldSummary | null;
  }>();

  const loadDetail = useCallback(
    async (submission: Submission | undefined) => {
      if (!slug || !submission) return;
      if (!terminalStatuses.has(submission.status)) {
        setDetail(undefined);
        return;
      }
      try {
        setDetail(await challengeApi.submissionDetails(slug, submission.id));
      } catch {
        setDetail(undefined);
      }
    },
    [slug],
  );

  const refreshSubmissions = useCallback(async () => {
    if (!slug) return;
    const values = await challengeApi.submissions(slug);
    setSubmissions(values);
    setSelected((current) => current ?? values[0]);
    if (!values.length) {
      setDetail(undefined);
      return;
    }
    await loadDetail(values[0]);
  }, [slug, loadDetail]);

  useEffect(() => {
    if (!slug) return;
    setDiagnostics([]);
    setSelectedDiagnostic(undefined);
    setAiErrorHint(undefined);
    setAiErrorUnavailable(false);
    void Promise.all([challengeApi.get(slug), challengeApi.submissions(slug)])
      .then(async ([item, history]) => {
        setChallenge(item);
        trackEvent('challenge_open', { slug });
        const initial = item.starterCode['PYTHON'] ?? defaultCode['PYTHON'];
        setCode(initial);
        setSubmissions(history);
        setSelected(history[0]);
        // A first visit has no submissions yet; loadDetail treats undefined as
        // "nothing to show" rather than dereferencing it and rejecting the load.
        await loadDetail(history[0]);
      })
      .catch(() => {
        setError('Challenge could not be loaded.');
      });
  }, [slug, loadDetail]);

  useEffect(() => {
    if (!selected || terminalStatuses.has(selected.status)) return;
    const timer = window.setInterval(() => void refreshSubmissions(), 1500);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshSubmissions, selected]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !slug) return;

    const socket = io({ auth: { token } });
    socket.on(
      'submission:completed',
      (event: { submissionId: string; status: string; score: number }) => {
        setSubmissions((current) =>
          current.map((submission) =>
            submission.id === event.submissionId
              ? { ...submission, status: event.status, score: event.score }
              : submission,
          ),
        );
        setSelected((current) => {
          if (!current || current.id !== event.submissionId) return current;
          const completed = { ...current, status: event.status, score: event.score };
          void challengeApi
            .submissionDetails(slug, event.submissionId)
            .then((submissionDetail) => {
              setDetail(submissionDetail);
            })
            .catch(() => {
              setDetail(undefined);
            });
          return completed;
        });
        if (
          event.status === 'ACCEPTED' &&
          !completedSubmissionsRef.current.has(event.submissionId)
        ) {
          completedSubmissionsRef.current.add(event.submissionId);
          trackEvent('level_complete', { slug });
        }
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [slug]);

  const isAccepted = useMemo(
    () => submissions.some((item) => item.status === 'ACCEPTED'),
    [submissions],
  );

  // Once the room is cleared, pull the updated world map to offer the next room
  // (or the world-complete celebration). This is optional enrichment: if the
  // fetch fails the completion banner still renders, just without the links.
  useEffect(() => {
    const room = challenge?.gameLevelContext;
    if (!room || !isAccepted) return;
    let cancelled = false;
    void Promise.all([worldApi.getLevels(room.worldId), worldApi.list()])
      .then(([world, worlds]) => {
        if (cancelled) return;
        const nextRoom = world.levels
          .filter(
            (level) =>
              level.number > room.levelNumber && level.access === 'OPEN' && level.challenge,
          )
          .sort((a, b) => a.number - b.number)[0];
        const index = worlds.findIndex((item) => item.id === world.id);
        setRoomProgress({
          nextRoomSlug: nextRoom?.challenge?.slug ?? null,
          worldComplete: (world.progress[0]?.completionPercent ?? 0) >= 100,
          nextWorld: index >= 0 ? (worlds[index + 1] ?? null) : null,
        });
      })
      .catch(() => {
        // Non-fatal: the banner renders without next-room links.
      });
    return () => {
      cancelled = true;
    };
  }, [challenge, isAccepted]);

  const visibleTests = useMemo(() => challenge?.testCases ?? [], [challenge]);

  const revealHint = async (level: number) => {
    if (!slug || revealingHint !== null) return;
    setRevealingHint(level);
    setError('');
    try {
      const item = await challengeApi.hint(slug, level);
      setRevealed((current) => ({
        ...current,
        [level]: { content: item.content, penalty: item.xpPenalty, helpful: item.helpful },
      }));
      trackEvent('hint_reveal', { level });
    } catch {
      setError('Unable to reveal this hint.');
    } finally {
      setRevealingHint(null);
    }
  };

  const voteStaticHint = async (level: number, helpful: boolean) => {
    if (!slug) return;
    setRevealed((current) => {
      const existing = current[level];
      if (!existing) return current;
      return { ...current, [level]: { ...existing, helpful } };
    });
    try {
      await challengeApi.hintFeedback(slug, level, helpful);
    } catch {
      setError('Unable to record hint feedback.');
    }
  };

  const requestAiHint = async (hintType?: AiHintResult['hintType']) => {
    if (!slug || !code.trim() || loadingAiHint) return;
    setLoadingAiHint(true);
    setError('');
    try {
      const result = await challengeApi.aiHint(slug, language, code, hintType);
      setAiHint(result);
      setAiHintVote(result.helpful);
    } catch {
      setError('AI hints are unavailable. Configure GROQ_API_KEY on the server.');
    } finally {
      setLoadingAiHint(false);
    }
  };

  const voteAiHint = async (helpful: boolean) => {
    if (!slug || !aiHint) return;
    setAiHintVote(helpful);
    try {
      await challengeApi.aiHintFeedback(slug, aiHint.hintId, helpful);
    } catch {
      setError('Unable to record hint feedback.');
    }
  };

  const requestAiErrorHint = async () => {
    if (!slug || !selectedDiagnostic || !code.trim() || loadingAiErrorHint) return;
    setLoadingAiErrorHint(true);
    setAiErrorUnavailable(false);
    try {
      const result = await challengeApi.aiErrorHint(slug, language, code, selectedDiagnostic);
      setAiErrorHint(result);
      setAiErrorVote(result.helpful);
    } catch {
      setAiErrorUnavailable(true);
    } finally {
      setLoadingAiErrorHint(false);
    }
  };

  const voteAiErrorHint = async (helpful: boolean) => {
    if (!slug || !aiErrorHint) return;
    setAiErrorVote(helpful);
    try {
      await challengeApi.aiHintFeedback(slug, aiErrorHint.hintId, helpful);
    } catch {
      setError('Unable to record hint feedback.');
    }
  };

  const submit = async () => {
    if (!slug || !code.trim() || busy) return;
    setBusy(true);
    setError('');
    setRun(undefined);
    setDiagnostics([]);
    setSelectedDiagnostic(undefined);
    setAiErrorHint(undefined);
    try {
      const submission = await challengeApi.submit(slug, language, code);
      setSelected(submission);
      setSubmissions((current) => [submission, ...current]);
      setDetail(undefined);
    } catch {
      setError('Submission failed. Check that you are signed in and try again.');
    } finally {
      setBusy(false);
    }
  };

  const runTests = async () => {
    if (!slug || !code.trim() || busy) return;
    setBusy(true);
    setError('');
    setAiErrorHint(undefined);
    setAiErrorUnavailable(false);
    try {
      const result = await challengeApi.run(slug, language, code);
      const nextDiagnostics = result.diagnostics ?? [];
      setRun(result);
      setDiagnostics(nextDiagnostics);
      setSelectedDiagnostic(nextDiagnostics[0]);
    } catch {
      setDiagnostics([]);
      setSelectedDiagnostic(undefined);
      setError('Unable to run against the example cases. The execution service may be offline.');
    } finally {
      setBusy(false);
    }
  };

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    setCode(challenge?.starterCode[next] ?? defaultCode[next]);
    setRun(undefined);
    setDiagnostics([]);
    setSelectedDiagnostic(undefined);
    setAiErrorHint(undefined);
  };

  const selectSubmission = async (submission: Submission) => {
    setSelected(submission);
    await loadDetail(submission);
  };

  const runRows = useMemo(() => {
    if (!run) return [];
    return run.results.map((result, index) => ({
      label: visibleTests[index] ? `Example ${String(index + 1)}` : `Test ${String(index + 1)}`,
      passed: result.passed,
      isHidden: false,
    }));
  }, [run, visibleTests]);

  const detailRows = useMemo(() => {
    if (!detail) return [];
    let visibleIndex = 0;
    let hiddenIndex = 0;
    return detail.results.map((result) => {
      if (result.testCase.isHidden) {
        hiddenIndex += 1;
        return {
          label: `Hidden test ${String(hiddenIndex)}`,
          passed: result.passed,
          isHidden: true,
        };
      }
      visibleIndex += 1;
      return { label: `Test ${String(visibleIndex)}`, passed: result.passed, isHidden: false };
    });
  }, [detail]);

  if (error && !challenge) return <div className="p-8 text-rose-200">{error}</div>;
  if (!challenge) return <div className="p-8 text-slate-300">Loading challenge…</div>;

  const room = challenge.gameLevelContext;
  const latest = submissions[0];
  const missionFailed = Boolean(
    latest &&
    terminalStatuses.has(latest.status) &&
    latest.status !== 'ACCEPTED' &&
    latest.status !== 'INTERNAL_ERROR',
  );

  // A locked room is a real wall, not a hidden button: if the player reached the
  // URL directly, show the door rather than the editor.
  if (room && !room.isCompleted && room.access !== 'OPEN') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 px-4 py-3">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <Link to={`/worlds/${room.worldId}`} className="text-sm text-brand-500">
              ← {room.worldName}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl p-8">
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[.06] p-8 text-center">
            <p className="text-4xl" aria-hidden="true">
              🔒
            </p>
            <h1 className="mt-4 text-2xl font-black">Room sealed</h1>
            <p className="mt-3 text-sm text-slate-300">{room.levelDescription}</p>
            {room.lock && <p className="mt-4 text-sm text-amber-200/90">{room.lock.prompt}</p>}
            <p className="mt-4 text-sm font-bold text-amber-200">
              {room.access === 'LOCKED'
                ? room.lock?.requiresKeyTitle
                  ? `You need the ${room.lock.requiresKeyTitle}.`
                  : 'This door needs a key you have not found yet.'
                : 'Clear the previous room to open this one.'}
            </p>
            <Link
              to={`/worlds/${room.worldId}`}
              className="mt-6 inline-block font-bold text-cyan-200 hover:text-white"
            >
              Return to the map →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div>
            <Link
              to={
                room ? `/worlds/${room.worldId}/rooms/${String(room.levelNumber)}` : '/challenges'
              }
              className="text-sm text-brand-500"
            >
              {room ? `← Room ${String(room.levelNumber)}` : '← Challenges'}
            </Link>
            {room && (
              <p className="text-[11px] font-bold tracking-[.18em] text-cyan-300 uppercase">
                Room {room.levelNumber} · {room.levelTitle}
              </p>
            )}
            <h1 className="text-lg font-bold">{challenge.title}</h1>
          </div>
          <div className="text-right text-xs text-slate-400">
            {challenge.timeLimitMs} ms · {challenge.memoryLimitMb} MB
          </div>
        </div>
      </header>

      {room && isAccepted && (
        <div className="border-b border-emerald-300/30 bg-emerald-300/[.08] px-4 py-3">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-emerald-200">MISSION COMPLETE</p>
              <p className="text-sm text-emerald-100/90">
                Room {room.levelNumber} cleared.
                {room.grantsKeyTitle ? ` Key found: ${room.grantsKeyTitle}.` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
              {roomProgress?.nextRoomSlug && (
                <Link
                  to={`/challenges/${encodeURIComponent(roomProgress.nextRoomSlug)}`}
                  className="text-cyan-200 hover:text-white"
                >
                  Next room →
                </Link>
              )}
              <Link
                to={`/worlds/${room.worldId}/rooms/${String(room.levelNumber)}?cleared=1`}
                className="text-cyan-200 hover:text-white"
              >
                Return to room
              </Link>
              <Link to={`/worlds/${room.worldId}`} className="text-cyan-200 hover:text-white">
                Return to map
              </Link>
            </div>
          </div>
          {roomProgress?.worldComplete && (
            <p className="mx-auto mt-2 max-w-[1600px] text-sm font-black text-amber-200">
              ESCAPE COMPLETE — you cleared {room.worldName}.
              {roomProgress.nextWorld && (
                <>
                  {' '}
                  <Link
                    to={`/worlds/${roomProgress.nextWorld.id}`}
                    className="text-cyan-200 hover:text-white"
                  >
                    Enter {roomProgress.nextWorld.name} →
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {!isAccepted && missionFailed && (
        <div className="border-b border-rose-400/30 bg-rose-500/[.08] px-4 py-2">
          <div className="mx-auto max-w-[1600px] text-sm font-black text-rose-200">
            ACCESS DENIED — your run did not pass. Fix the failing cases and try again.
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-[1600px] gap-4 p-4 xl:grid-cols-[minmax(360px,0.8fr)_minmax(520px,1.2fr)]">
        <section className="space-y-5 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-5 xl:max-h-[calc(100vh-110px)]">
          {room && (
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[.05] p-3">
              <p className="text-[11px] font-bold tracking-[.18em] text-cyan-200 uppercase">
                Mission · {room.worldName}
              </p>
              <p className="mt-1 text-sm text-slate-200">{room.levelDescription}</p>
              {room.lock && <p className="mt-1 text-xs text-amber-200/90">{room.lock.prompt}</p>}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-brand-500">
                {challenge.difficulty}
              </span>
              <span className="rounded bg-cyan-400/15 px-2 py-1 text-xs font-bold text-cyan-200">
                {typeLabel(challenge.type)}
              </span>
            </div>
            <span className="text-sm text-amber-300">+{challenge.xpReward} XP</span>
          </div>
          <article className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
            {challenge.statement}
          </article>
          {challenge.constraints && (
            <section>
              <h2 className="font-semibold">Constraints</h2>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-300">
                {challenge.constraints}
              </pre>
            </section>
          )}
          <section>
            <h2 className="font-semibold">Examples</h2>
            {visibleTests.map((test, index) => (
              <div key={test.id} className="mt-3 rounded bg-slate-950 p-3 text-xs">
                <p className="font-semibold text-slate-400">Example {index + 1}</p>
                <p className="mt-2 text-slate-300">Input</p>
                <pre>{test.input}</pre>
                <p className="mt-2 text-slate-300">Output</p>
                <pre>{test.expectedOutput}</pre>
                {test.explanation && <p className="mt-2 text-slate-400">{test.explanation}</p>}
              </div>
            ))}
          </section>
        </section>
        <section className="relative flex min-h-[680px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 p-3">
            <select
              aria-label="Language"
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              value={language}
              onChange={(event) => {
                chooseLanguage(event.target.value as Language);
              }}
            >
              {challenge.supportedLanguages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <label className="ml-auto text-xs text-slate-400">
              Font{' '}
              <input
                aria-label="Font size"
                className="w-16 bg-transparent"
                type="number"
                min="12"
                max="24"
                value={fontSize}
                onChange={(event) => {
                  setFontSize(Number(event.target.value));
                }}
              />
            </label>
            <button
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              onClick={() => {
                setCode(challenge.starterCode[language] ?? defaultCode[language]);
                setRun(undefined);
                setDiagnostics([]);
                setSelectedDiagnostic(undefined);
                setAiErrorHint(undefined);
              }}
            >
              Reset
            </button>
            <button
              disabled={busy}
              className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void runTests()}
            >
              {busy ? 'Working…' : 'Run tests'}
            </button>
            <button
              disabled={busy}
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void submit()}
            >
              {busy ? 'Working…' : 'Submit'}
            </button>
          </div>
          {diagnostics.length > 0 && (
            <button
              type="button"
              aria-label="Get AI help for this error"
              title="Need help with this error?"
              disabled={loadingAiErrorHint}
              onClick={() => void requestAiErrorHint()}
              className="absolute right-4 top-16 z-10 rounded-full border border-cyan-300/60 bg-slate-950/95 px-4 py-2 text-xs font-bold text-cyan-100 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-60"
            >
              {loadingAiErrorHint ? '🤖 Thinking…' : '🤖 AI Hint'}
            </button>
          )}
          {typeGuidance(challenge.type) && (
            <p
              role="note"
              className="border-b border-slate-800 bg-slate-950 px-4 py-2 text-xs text-cyan-100/80"
            >
              {typeGuidance(challenge.type)}
            </p>
          )}
          <div className="min-h-[380px] flex-1">
            <MonacoCodeEditor
              key={language}
              value={code}
              language={language}
              fontSize={fontSize}
              onChange={setCode}
              diagnostics={diagnostics}
              revealDiagnostic={selectedDiagnostic}
            />
          </div>
          {diagnostics.length > 0 && (
            <section
              aria-label="Execution diagnostics"
              className="relative border-t border-rose-400/20 bg-rose-950/20 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-rose-200">Execution diagnostics</h2>
              </div>
              <div className="mt-3 space-y-2">
                {diagnostics.map((diagnostic, index) => {
                  const active = diagnostic === selectedDiagnostic;
                  return (
                    <button
                      type="button"
                      key={`${diagnostic.testCaseId ?? 'diagnostic'}-${String(index)}`}
                      onClick={() => {
                        setSelectedDiagnostic(diagnostic);
                      }}
                      className={`block w-full rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${active ? 'border-cyan-300/60 bg-slate-900' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className={diagnosticTone(diagnostic.status)}>
                          {diagnosticTitle(diagnostic.status)}
                        </span>
                        {diagnostic.line && (
                          <span className="text-slate-400">
                            Line {String(diagnostic.line)}
                            {diagnostic.column ? `, Column ${String(diagnostic.column)}` : ''}
                          </span>
                        )}
                        {diagnostic.testCaseId && (
                          <span className="text-slate-500">Test case failed</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-200">{diagnostic.message}</p>
                      {diagnostic.rawOutput && (
                        <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-xs text-rose-100/80">
                          {diagnostic.rawOutput}
                        </pre>
                      )}
                    </button>
                  );
                })}
              </div>
              {loadingAiErrorHint && (
                <p className="mt-3 text-sm text-cyan-100" role="status">
                  Analyzing your error…
                </p>
              )}
              {aiErrorUnavailable && (
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-rose-200">
                  <span>AI assistance is temporarily unavailable.</span>
                  <button
                    type="button"
                    className="font-semibold text-cyan-200 underline"
                    onClick={() => void requestAiErrorHint()}
                  >
                    Try again
                  </button>
                </div>
              )}
              {aiErrorHint && !loadingAiErrorHint && (
                <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[.06] p-3 text-sm text-slate-200">
                  <h3 className="font-semibold text-cyan-100">AI Hint</h3>
                  <p className="mt-2 whitespace-pre-wrap">{aiErrorHint.explanation}</p>
                  <p className="mt-3 font-semibold text-cyan-100">Hint</p>
                  <p className="mt-1 whitespace-pre-wrap">{aiErrorHint.hint}</p>
                  {aiErrorHint.suggestedFix && (
                    <>
                      <p className="mt-3 font-semibold text-cyan-100">Suggested direction</p>
                      <p className="mt-1 whitespace-pre-wrap">{aiErrorHint.suggestedFix}</p>
                    </>
                  )}
                  <HintFeedback
                    value={aiErrorVote}
                    onVote={(helpful) => void voteAiErrorHint(helpful)}
                  />
                </div>
              )}
            </section>
          )}
          <div className="max-h-64 overflow-auto border-t border-slate-800 bg-slate-950 p-4">
            <div className="flex justify-between">
              <h2 className="text-sm font-semibold">Output console</h2>
              {selected && (run || detail) && (
                <span className={`text-xs ${statusTone(run?.status ?? detail?.status ?? '')}`}>
                  {run ? `Run · ${run.status}` : detail?.status}
                </span>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
            {run ? (
              <div className="mt-3 space-y-2">
                <p className="font-mono text-xs text-slate-300">
                  Time: {run.executionTimeMs ?? '—'} ms · Memory: {run.memoryUsedKb ?? '—'} KB
                </p>
                {run.compilerOutput && (
                  <pre className="whitespace-pre-wrap rounded bg-slate-900 p-2 text-xs text-rose-200">
                    {run.compilerOutput}
                  </pre>
                )}
                {runRows.map((row) => (
                  <ResultRow key={`${row.label}-${String(row.passed)}`} {...row} />
                ))}
              </div>
            ) : detail ? (
              <div className="mt-3 space-y-2">
                <p className="font-mono text-xs text-slate-300">
                  Score: {detail.score} · Time: {detail.executionTimeMs ?? '—'} ms · Memory:{' '}
                  {detail.memoryUsedKb ?? '—'} KB
                </p>
                {detail.compilerOutput && (
                  <pre className="whitespace-pre-wrap rounded bg-slate-900 p-2 text-xs text-rose-200">
                    {detail.compilerOutput}
                  </pre>
                )}
                {detailRows.map((row) => (
                  <ResultRow key={`${row.label}-${String(row.isHidden)}`} {...row} />
                ))}
              </div>
            ) : selected ? (
              <p className="mt-3 font-mono text-xs text-slate-300">
                {selected.status} · Score: {selected.score} · Time:{' '}
                {selected.executionTimeMs ?? '—'} ms · Memory: {selected.memoryUsedKb ?? '—'} KB
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Run or submit your solution to see results.
              </p>
            )}
            <h3 className="mt-4 text-xs font-semibold uppercase text-slate-500">
              Submission history
            </h3>
            {submissions.slice(0, 5).map((item) => (
              <button
                key={item.id}
                className="mt-2 block text-left text-xs text-slate-300 hover:text-white"
                onClick={() => void selectSubmission(item)}
              >
                {new Date(item.createdAt).toLocaleTimeString()} · {item.language} · {item.status}
              </button>
            ))}
          </div>
        </section>
      </main>
      <button
        type="button"
        onClick={() => {
          setHintsOpen(true);
        }}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-cyan-400/40 bg-slate-900 px-4 py-2 text-sm font-bold text-cyan-200 shadow-lg hover:bg-slate-800"
      >
        Hints
        {challenge.hints.length > 0 && (
          <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
            {challenge.hints.length}
          </span>
        )}
      </button>
      {hintsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close hints"
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => {
              setHintsOpen(false);
            }}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-800 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Hints</h2>
              <button
                type="button"
                onClick={() => {
                  setHintsOpen(false);
                }}
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {challenge.hints.length === 0 ? (
              <p className="text-sm text-slate-400">No static hints for this challenge.</p>
            ) : (
              <div className="space-y-2">
                {challenge.hints.map((hint) => {
                  const item = revealed[hint.level];
                  return (
                    <div
                      key={hint.level}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-cyan-400">Hint {hint.level}</span>
                        {hint.xpPenalty > 0 && (
                          <span className="text-xs text-amber-300/80">
                            Costs {hint.xpPenalty} XP on completion
                          </span>
                        )}
                      </div>
                      {item ? (
                        <>
                          <p className="mt-2 text-sm text-slate-200">{item.content}</p>
                          <HintFeedback
                            value={item.helpful ?? null}
                            onVote={(helpful) => void voteStaticHint(hint.level, helpful)}
                          />
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={revealingHint !== null}
                          onClick={() => void revealHint(hint.level)}
                          className="mt-2 rounded border border-slate-700 px-3 py-1 text-xs text-brand-500 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {revealingHint === hint.level ? 'Revealing…' : 'Reveal'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <section className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[.04] p-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">AI hint</h2>
                <button
                  type="button"
                  disabled={loadingAiHint || !code.trim()}
                  onClick={() => {
                    void requestAiHint();
                  }}
                  className="rounded border border-cyan-400/40 px-3 py-1 text-xs font-bold text-cyan-200 hover:bg-cyan-400/10 disabled:pointer-events-none disabled:opacity-50"
                >
                  {loadingAiHint ? 'Thinking...' : 'Get hint'}
                </button>
              </div>
              {aiHint && (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-cyan-200">
                    <span className="rounded border border-cyan-400/30 px-2 py-0.5">
                      {aiHint.hintType.toLowerCase()}
                    </span>
                    {aiHint.personalized && <span>Personalized from your progress</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{aiHint.hint}</p>
                  <HintFeedback value={aiHintVote} onVote={(helpful) => void voteAiHint(helpful)} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void requestAiHint('DIRECTIONAL')}
                      disabled={loadingAiHint}
                      className="text-[11px] text-cyan-200 underline disabled:opacity-50"
                    >
                      Different hint
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestAiHint('EXAMPLE')}
                      disabled={loadingAiHint}
                      className="text-[11px] text-cyan-200 underline disabled:opacity-50"
                    >
                      Show an example
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {aiHint.quota.remaining} of {aiHint.quota.limit} AI hints left
                  </p>
                </>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
