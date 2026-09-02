import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { challengeApi, type ChallengeSummary } from '@/features/challenges/lib/challenge-api';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { duelApi, type Duel } from '../lib/duel-api';

export function DuelLobbyPage() {
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const [availableChallenges, openDuels] = await Promise.all([
      challengeApi.list(),
      duelApi.list(),
    ]);
    setChallenges(availableChallenges);
    setDuels(openDuels);
    setChallengeId((current) => current || availableChallenges[0]?.id || '');
  };

  useEffect(() => {
    void load().catch(() => {
      setError('Duel lobby is unavailable right now.');
    });
  }, []);

  const create = async () => {
    if (!challengeId || busy) return;
    setBusy(true);
    setError('');
    try {
      const duel = await duelApi.create(challengeId);
      void navigate(`/duels/${duel.id}`);
      await load();
    } catch {
      setError('Unable to create a duel.');
    } finally {
      setBusy(false);
    }
  };

  const join = async (duelId: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const duel = await duelApi.join(duelId);
      setDuels((current) => current.filter((item) => item.id !== duel.id));
      void navigate(`/duels/${duel.id}`);
    } catch {
      setError('That duel is no longer available.');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlayerPageShell
      eyebrow="Duel lobby"
      title="Challenge another runner"
      subtitle="Create an open match or join a player waiting on the same coding challenge."
      maxWidth="4xl"
    >
      {error && <p className="mb-5 text-sm text-rose-300">{error}</p>}
      <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.05] p-5">
        <h2 className="font-bold text-white">Create a duel</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Duel challenge"
            value={challengeId}
            onChange={(event) => {
              setChallengeId(event.target.value);
            }}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            {challenges.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !challengeId}
            onClick={() => {
              void create();
            }}
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            Open match
          </button>
        </div>
      </section>
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-white">Open matches</h2>
          <span className="text-xs text-slate-500">{duels.length} waiting</span>
        </div>
        {duels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
            No players are waiting right now.
          </div>
        ) : (
          <div className="space-y-3">
            {duels.map((duel) => (
              <div
                key={duel.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-white">{duel.challenge.title}</p>
                  <p className="mt-1 text-xs text-slate-400">Hosted by @{duel.creator.username}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void join(duel.id);
                  }}
                  className="rounded-lg border border-cyan-300/40 px-4 py-2 text-sm font-bold text-cyan-200 disabled:opacity-50"
                >
                  Join duel
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <Link to="/challenges" className="mt-6 inline-block text-sm font-bold text-cyan-200">
        Practice solo →
      </Link>
    </PlayerPageShell>
  );
}
