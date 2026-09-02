import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { leaderboardApi, type LeaderboardEntry } from '../lib/leaderboard-api';

type BoardType = 'global' | 'weekly';

function Entry({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className="flex items-center gap-4 border-b border-white/10 px-5 py-4 last:border-b-0">
      <span className="w-8 text-center text-sm font-black text-cyan-200">#{entry.rank}</span>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">
        {entry.displayName.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">
        {entry.displayName}
      </span>
      <span className="text-sm font-bold text-amber-200">{entry.xp.toLocaleString()} XP</span>
    </li>
  );
}

export function LeaderboardPage() {
  const [type, setType] = useState<BoardType>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; xp: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    void leaderboardApi
      .list(type)
      .then((result) => {
        setEntries(result.leaderboard);
        setMyRank(result.myRank);
      })
      .catch(() => {
        setError('Leaderboard is unavailable right now.');
      });
  }, [type]);

  return (
    <PlayerPageShell
      eyebrow="Global standings"
      title="Climb the leaderboard"
      subtitle="Track your progress against the fastest escape runners."
      maxWidth="4xl"
    >
      <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-white/[.03] p-1">
        {(['global', 'weekly'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setType(option);
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${type === option ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            {option}
          </button>
        ))}
      </div>

      {myRank && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] px-5 py-4">
          <span className="text-sm text-slate-300">Your rank</span>
          <span className="font-black text-cyan-200">
            #{myRank.rank} · {myRank.xp.toLocaleString()} XP
          </span>
        </div>
      )}

      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
          No ranked players yet.
        </div>
      ) : (
        <motion.ol
          key={type}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"
        >
          {entries.map((entry) => (
            <Entry key={entry.userId} entry={entry} />
          ))}
        </motion.ol>
      )}
    </PlayerPageShell>
  );
}
