import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MonacoCodeEditor } from '@/features/challenges/components/MonacoCodeEditor';
import {
  challengeApi,
  type Challenge,
  type Language,
  type Submission,
} from '@/features/challenges/lib/challenge-api';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { duelApi, type Duel } from '../lib/duel-api';
import { useDuelRealtime } from '../lib/use-duel-realtime';

const defaultCode: Record<Language, string> = {
  PYTHON: '# Write your solution here\n',
  JAVA: 'class Main {\n  public static void main(String[] args) {\n  }\n}\n',
  JAVASCRIPT: '// Write your solution here\n',
  TYPESCRIPT: '// Write your solution here\n',
  CPP: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {}\n',
  GO: 'package main\n\nfunc main() {}\n',
  RUST: 'fn main() {}\n',
};

export function DuelArenaPage() {
  const { duelId = '' } = useParams();
  const [duel, setDuel] = useState<Duel>();
  const [challenge, setChallenge] = useState<Challenge>();
  const [language, setLanguage] = useState<Language>('PYTHON');
  const [code, setCode] = useState(defaultCode.PYTHON);
  const [submission, setSubmission] = useState<Submission>();
  const [winnerId, setWinnerId] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const userId = (() => {
    try {
      const token = localStorage.getItem('access_token');
      return token
        ? (JSON.parse(atob(token.split('.')[1] ?? '')) as { sub?: string }).sub
        : undefined;
    } catch {
      return undefined;
    }
  })();
  const handleResult = useCallback((event: { winnerId: string | null; status: string }) => {
    setWinnerId(event.winnerId ?? undefined);
    setDuel((current) =>
      current
        ? {
            ...current,
            status: event.status as Duel['status'],
            completedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);
  const realtime = useDuelRealtime(duelId, userId, handleResult);

  useEffect(() => {
    if (!duelId) return;
    void duelApi
      .get(duelId)
      .then(async (item) => {
        setDuel(item);
        setWinnerId(item.winnerId ?? undefined);
        const challengeItem = await challengeApi.get(item.challenge.slug);
        setChallenge(challengeItem);
        const nextLanguage = challengeItem.supportedLanguages[0] ?? 'PYTHON';
        setLanguage(nextLanguage);
        setCode(challengeItem.starterCode[nextLanguage] ?? defaultCode[nextLanguage]);
      })
      .catch(() => {
        setError('This duel could not be loaded.');
      });
  }, [duelId]);

  const submit = async () => {
    if (!duelId || !code.trim() || busy || duel?.status !== 'ACTIVE') return;
    setBusy(true);
    setError('');
    try {
      setSubmission(await duelApi.submit(duelId, language, code));
      realtime.emitProgress({
        passed: 0,
        total: challenge?.testCases.length ?? 0,
        elapsedMs: 0,
        language,
        status: 'SUBMITTED',
      });
    } catch {
      setError('Unable to submit your duel solution.');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <PlayerPageShell eyebrow="Duel arena" title="Duel unavailable" subtitle={error}>
        <Link to="/duels" className="text-cyan-200">
          Return to lobby
        </Link>
      </PlayerPageShell>
    );
  }
  if (!duel || !challenge) {
    return (
      <PlayerPageShell
        eyebrow="Duel arena"
        title="Loading duel..."
        subtitle="Preparing the challenge."
      >
        <div />
      </PlayerPageShell>
    );
  }

  return (
    <PlayerPageShell
      eyebrow="Live duel"
      title={challenge.title}
      subtitle={`Against @${duel.opponent?.username ?? 'waiting for an opponent'}`}
      maxWidth="7xl"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-sm">
        <span
          className={
            duel.status === 'ACTIVE' ? 'font-bold text-emerald-300' : 'font-bold text-amber-300'
          }
        >
          {duel.status}
        </span>
        {winnerId ? (
          <span className="font-bold text-cyan-200">
            Winner:{' '}
            {duel.creator.id === winnerId
              ? `@${duel.creator.username}`
              : `@${duel.opponent?.username ?? 'opponent'}`}
          </span>
        ) : (
          <span className="text-slate-400">First accepted solution wins</span>
        )}
      </div>
      <div className="grid min-h-[620px] gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <h2 className="text-lg font-bold text-white">Challenge</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {challenge.statement}
          </p>
          {challenge.constraints && (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {challenge.constraints}
            </p>
          )}
        </section>
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
            <select
              aria-label="Duel language"
              value={language}
              onChange={(event) => {
                const next = event.target.value as Language;
                setLanguage(next);
                setCode(challenge.starterCode[next] ?? defaultCode[next]);
              }}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              {challenge.supportedLanguages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || duel.status !== 'ACTIVE'}
              onClick={() => {
                void submit();
              }}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {busy ? 'Submitting...' : 'Submit solution'}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <MonacoCodeEditor
              value={code}
              language={language}
              fontSize={14}
              onChange={(nextCode) => {
                setCode(nextCode);
                realtime.emitCode(nextCode, language);
              }}
              readOnly={duel.status !== 'ACTIVE'}
            />
          </div>
          {submission && (
            <p className="border-t border-white/10 p-3 text-sm text-slate-300">
              Submission status:{' '}
              <span className="font-bold text-cyan-200">{submission.status}</span>
            </p>
          )}
        </section>
      </div>
      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.05] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">Live duel control</h2>
              <p className="mt-1 text-xs text-slate-400">
                {realtime.connected ? 'Connected' : 'Connecting'} ·{' '}
                {realtime.state?.spectators ?? 0} spectator(s)
              </p>
            </div>
            <button
              type="button"
              disabled={duel.status !== 'ACTIVE'}
              onClick={() => {
                setReady((current) => !current);
                realtime.setReady(!ready);
              }}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {ready ? 'Ready' : 'Ready up'}
            </button>
          </div>
          {realtime.countdown !== undefined && (
            <p className="mt-4 text-center text-4xl font-black text-cyan-200">
              {realtime.countdown}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
            <span>Opponent progress</span>
            <span>
              {realtime.opponentProgress?.passed ?? 0}/{realtime.opponentProgress?.total ?? 0} tests
              · {realtime.opponentProgress?.status ?? 'IDLE'}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-300 transition-all"
              style={{
                width: `${String(realtime.opponentProgress?.total ? Math.min(100, (realtime.opponentProgress.passed / realtime.opponentProgress.total) * 100) : 0)}%`,
              }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">Opponent code</h2>
            <span className="text-xs text-slate-500">read only</span>
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-300">
            {realtime.opponentCode || 'Waiting for the opponent to type...'}
          </pre>
          <div className="mt-3 flex gap-2">
            <input
              value={chatInput}
              onChange={(event) => {
                setChatInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && chatInput.trim()) {
                  realtime.sendChat(chatInput);
                  setChatInput('');
                }
              }}
              placeholder="Spectator chat"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (chatInput.trim()) {
                  realtime.sendChat(chatInput);
                  setChatInput('');
                }
              }}
              className="rounded-lg border border-white/10 px-3 text-xs text-slate-200"
            >
              Send
            </button>
          </div>
          <div className="mt-2 max-h-20 overflow-auto text-xs text-slate-400">
            {realtime.messages.map((message, index) => (
              <p key={`${message.userId}-${String(index)}`}>
                @{message.userId.slice(0, 8)}: {message.message}
              </p>
            ))}
          </div>
        </div>
      </section>
      {duel.status === 'COMPLETED' && (
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <h2 className="font-bold text-white">Final results</h2>
          <div className="mt-3 space-y-2">
            {duel.submissions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-b border-white/10 py-2 text-sm last:border-b-0"
              >
                <span className="text-slate-300">@{item.user.username}</span>
                <span
                  className={
                    item.userId === winnerId ? 'font-bold text-emerald-300' : 'text-slate-400'
                  }
                >
                  {item.status} · {item.score} points
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </PlayerPageShell>
  );
}
