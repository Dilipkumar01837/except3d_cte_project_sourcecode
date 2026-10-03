import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { worldApi, type WorldSummary } from '../lib/world-api';

export function WorldsPage() {
  const { user } = useAuthStore();
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [error, setError] = useState('');

  const playerXp = user?.profile?.xp ?? 0;

  useEffect(() => {
    void worldApi
      .list()
      .then((items) => {
        setWorlds(items);
      })
      .catch(() => {
        setError('Worlds are unavailable right now.');
      });
  }, []);

  return (
    <PlayerPageShell
      eyebrow="Escape map"
      title="Choose your next world"
      subtitle="Unlock themed programming paths, then work through each level at your own pace."
      maxWidth="7xl"
    >
      {error && <p className="mb-6 text-sm text-rose-300">{error}</p>}
      {!error && worlds.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
          No published worlds are available yet.
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {worlds.map((world, index) => {
          const progress = world.progress[0]?.completionPercent ?? 0;
          // A world is reachable once the player has earned its XP requirement.
          // Relying only on the stored progress row hid the first world
          // (requiredXp 0) from every brand-new player, who has no row yet.
          const unlocked = (world.progress[0]?.isUnlocked ?? false) || playerXp >= world.requiredXp;
          return (
            <motion.article
              key={world.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl border p-6 ${unlocked ? 'border-cyan-300/25 bg-white/[.045]' : 'border-white/10 bg-white/[.02] opacity-75'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">
                    World {String(index + 1)}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">{world.name}</h2>
                </div>
                <span className="text-2xl" aria-hidden="true">
                  {unlocked ? '◈' : '◌'}
                </span>
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{world.description}</p>
              <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                <span>{world._count.levels} levels</span>
                <span>{world.estimatedMinutes} min</span>
                <span>{world.requiredXp} XP to unlock</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400"
                  style={{ width: `${String(progress)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className={unlocked ? 'text-emerald-300' : 'text-amber-300'}>
                  {unlocked ? 'Unlocked' : 'Locked'}
                </span>
                <span className="text-slate-400">{progress}% complete</span>
              </div>
              {unlocked ? (
                <Link
                  to={`/worlds/${world.id}`}
                  className="mt-6 block text-sm font-bold text-cyan-200 hover:text-white"
                >
                  View levels <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <p className="mt-6 text-sm text-slate-500">Earn more XP to unlock this world.</p>
              )}
            </motion.article>
          );
        })}
      </div>
    </PlayerPageShell>
  );
}
