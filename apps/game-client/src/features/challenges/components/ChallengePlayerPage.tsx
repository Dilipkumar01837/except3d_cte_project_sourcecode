import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MonacoCodeEditor } from './MonacoCodeEditor';
import { challengeApi, type Challenge, type Language, type Submission } from '../lib/challenge-api';

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

export function ChallengePlayerPage() {
  const { slug = '' } = useParams();
  const [challenge, setChallenge] = useState<Challenge>();
  const [language, setLanguage] = useState<Language>('PYTHON');
  const [code, setCode] = useState(defaultCode.PYTHON);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission>();
  const [hint, setHint] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const refreshSubmissions = useCallback(async () => {
    if (!slug) return;
    const values = await challengeApi.submissions(slug);
    setSubmissions(values);
    setSelected(values[0]);
  }, [slug]);
  useEffect(() => {
    if (!slug) return;
    void Promise.all([challengeApi.get(slug), challengeApi.submissions(slug)])
      .then(([item, history]) => {
        setChallenge(item);
        const initial = item.starterCode['PYTHON'] ?? defaultCode['PYTHON'];
        setCode(initial);
        setSubmissions(history);
        setSelected(history[0]);
      })
      .catch(() => {
        setError('Challenge could not be loaded.');
      });
  }, [slug]);
  useEffect(() => {
    if (!selected || terminalStatuses.has(selected.status)) return;
    const timer = window.setInterval(() => void refreshSubmissions(), 1500);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshSubmissions, selected]);
  const visibleTests = useMemo(() => challenge?.testCases ?? [], [challenge]);
  const submit = async () => {
    if (!slug || !code.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const submission = await challengeApi.submit(slug, language, code);
      setSelected(submission);
      setSubmissions((current) => [submission, ...current]);
    } catch {
      setError('Submission failed. Check that you are signed in and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    setCode(challenge?.starterCode[next] ?? defaultCode[next]);
  };
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
          {challenge.hints.length > 0 && (
            <section>
              <button
                className="text-sm text-brand-500"
                onClick={() =>
                  void challengeApi
                    .hint(slug, 1)
                    .then((item) => {
                      setHint(item.content);
                    })
                    .catch(() => {
                      setError('Unable to reveal this hint.');
                    })
                }
              >
                Reveal hint
              </button>
              {hint && <p className="mt-2 rounded bg-brand-900/40 p-3 text-sm">{hint}</p>}
            </section>
          )}
        </section>
        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
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
              }}
            >
              Reset
            </button>
            <button
              disabled={submitting}
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void submit()}
            >
              {submitting ? 'Queueing…' : 'Run & Submit'}
            </button>
          </div>
          <div className="min-h-[380px] flex-1">
            <MonacoCodeEditor
              key={language}
              value={code}
              language={language}
              fontSize={fontSize}
              onChange={setCode}
            />
          </div>
          <div className="max-h-64 overflow-auto border-t border-slate-800 bg-slate-950 p-4">
            <div className="flex justify-between">
              <h2 className="text-sm font-semibold">Output console</h2>
              {selected && <span className="text-xs text-brand-500">{selected.status}</span>}
            </div>
            {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
            {selected ? (
              <p className="mt-3 font-mono text-xs text-slate-300">
                Score: {selected.score} · Time: {selected.executionTimeMs ?? '—'} ms · Memory:{' '}
                {selected.memoryUsedKb ?? '—'} KB
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Run your solution to see results.</p>
            )}
            <h3 className="mt-4 text-xs font-semibold uppercase text-slate-500">
              Submission history
            </h3>
            {submissions.slice(0, 5).map((item) => (
              <button
                key={item.id}
                className="mt-2 block text-left text-xs text-slate-300 hover:text-white"
                onClick={() => {
                  setSelected(item);
                }}
              >
                {new Date(item.createdAt).toLocaleTimeString()} · {item.language} · {item.status}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
