import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const loadDetail = useCallback(
    async (submission: Submission) => {
      if (!slug) return;
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
    await loadDetail(values[0] as Submission);
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
        const initial = item.starterCode['PYTHON'] ?? defaultCode['PYTHON'];
        setCode(initial);
        setSubmissions(history);
        setSelected(history[0]);
        await loadDetail(history[0] as Submission);
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
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [slug]);

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

  const requestAiHint = async () => {
    if (!slug || !code.trim() || loadingAiHint) return;
    setLoadingAiHint(true);
    setError('');
    try {
      const result = await challengeApi.aiHint(slug, language, code);
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
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div>
            <Link to="/challenges" className="text-sm text-brand-500">
              ← Challenges
            </Link>
            <h1 className="text-lg font-bold">{challenge.title}</h1>
          </div>
          <div className="text-right text-xs text-slate-400">
            {challenge.timeLimitMs} ms · {challenge.memoryLimitMb} MB
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1600px] gap-4 p-4 xl:grid-cols-[minmax(360px,0.8fr)_minmax(520px,1.2fr)]">
        <section className="space-y-5 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-5 xl:max-h-[calc(100vh-110px)]">
          <div className="flex items-center justify-between">
            <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-brand-500">
              {challenge.difficulty}
            </span>
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
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{aiHint.hint}</p>
                  <HintFeedback value={aiHintVote} onVote={(helpful) => void voteAiHint(helpful)} />
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
