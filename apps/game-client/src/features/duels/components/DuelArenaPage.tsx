import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!duelId) return;
    void duelApi
      .get(duelId)
      .then(async (item) => {
        setDuel(item);
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

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const socket = io({ auth: { token } });
    socket.on('duel:started', (event: { duelId: string }) => {
      if (event.duelId === duelId)
        setDuel((current) => (current ? { ...current, status: 'ACTIVE' } : current));
    });
    socket.on('duel:completed', (event: { duelId: string; winnerId: string }) => {
      if (event.duelId === duelId) {
        setWinnerId(event.winnerId);
        setDuel((current) =>
          current
            ? { ...current, status: 'COMPLETED', completedAt: new Date().toISOString() }
            : current,
        );
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [duelId]);

  const submit = async () => {
    if (!duelId || !code.trim() || busy || duel?.status !== 'ACTIVE') return;
    setBusy(true);
    setError('');
    try {
      setSubmission(await duelApi.submit(duelId, language, code));
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
          <span className="font-bold text-cyan-200">Winner recorded</span>
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
              onChange={setCode}
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
    </PlayerPageShell>
  );
}
