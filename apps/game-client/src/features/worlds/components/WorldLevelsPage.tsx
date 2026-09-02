import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { worldApi, type WorldDetail } from '../lib/world-api';

export function WorldLevelsPage() {
  const { worldId = '' } = useParams();
  const [world, setWorld] = useState<WorldDetail>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!worldId) return;
    void worldApi
      .getLevels(worldId)
      .then((item) => {
        setWorld(item);
      })
      .catch(() => {
        setError('This world could not be loaded.');
      });
  }, [worldId]);

  if (error) {
    return (
      <PlayerPageShell eyebrow="Escape map" title="World unavailable" subtitle={error}>
        <Link className="text-cyan-200" to="/worlds">
          Return to worlds
        </Link>
      </PlayerPageShell>
    );
  }
  if (!world) {
    return (
      <PlayerPageShell
        eyebrow="Escape map"
        title="Loading world..."
        subtitle="Preparing your next route."
      >
        <div />
      </PlayerPageShell>
    );
  }

  return (
    <PlayerPageShell
      eyebrow={world.name}
      title="Level progression"
      subtitle={world.description}
      actions={
        <Link className="text-sm font-bold text-cyan-200" to="/worlds">
          ← All worlds
        </Link>
      }
      maxWidth="4xl"
    >
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-5 text-sm">
        <span className="text-slate-400">World progress</span>
        <span className="font-bold text-cyan-200">
          {world.progress[0]?.completionPercent ?? 0}%
        </span>
      </div>
      <div className="space-y-3">
        {world.levels.map((level, index) => {
          const progress = level.progress[0];
          return (
            <motion.article
              key={level.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 font-black text-cyan-200">
                  {level.number}
                </span>
                <div>
                  <h2 className="font-bold text-white">{level.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{level.description}</p>
                  <p className="mt-2 text-xs text-amber-200">
                    +{level.xpReward} XP · {progress?.attempts ?? 0} attempts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:shrink-0">
                <span
                  className={
                    progress?.isCompleted
                      ? 'text-sm font-bold text-emerald-300'
                      : 'text-sm text-slate-500'
                  }
                >
                  {progress?.isCompleted ? 'Completed' : 'Not started'}
                </span>
                {level.challenge ? (
                  <Link
                    to={`/challenges/${encodeURIComponent(level.challenge.slug)}`}
                    className="text-sm font-bold text-cyan-200 hover:text-white"
                  >
                    Play level →
                  </Link>
                ) : (
                  <Link
                    to="/challenges"
                    className="text-sm font-bold text-cyan-200 hover:text-white"
                  >
                    Browse challenges →
                  </Link>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </PlayerPageShell>
  );
}
