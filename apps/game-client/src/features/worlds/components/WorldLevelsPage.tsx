import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { trackEvent } from '@/shared/lib/telemetry';
import { worldApi, type WorldDetail, type WorldLevel, type WorldSummary } from '../lib/world-api';

function accessLabel(level: WorldLevel): { text: string; className: string } {
  if (level.isCompleted) {
    return { text: 'Cleared', className: 'text-emerald-300' };
  }
  switch (level.access) {
    case 'LOCKED':
      return { text: 'Locked', className: 'text-amber-300' };
    case 'SEQUENTIAL':
      return { text: 'Clear the level before', className: 'text-slate-500' };
    default:
      return { text: 'Open', className: 'text-cyan-200' };
  }
}

export function WorldLevelsPage() {
  const { worldId = '' } = useParams();
  const [world, setWorld] = useState<WorldDetail>();
  const [nextWorld, setNextWorld] = useState<WorldSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!worldId) return;
    void worldApi
      .getLevels(worldId)
      .then((item) => {
        setWorld(item);
        trackEvent('world_enter', { worldId });
      })
      .catch(() => {
        setError('This world could not be loaded.');
      });
  }, [worldId]);

  const completionPercent = world?.progress[0]?.completionPercent ?? 0;

  // When every room is cleared, find the next world so the escape can continue.
  useEffect(() => {
    if (!world || completionPercent < 100) return;
    let cancelled = false;
    void worldApi
      .list()
      .then((worlds) => {
        if (cancelled) return;
        const index = worlds.findIndex((item) => item.id === world.id);
        setNextWorld(index >= 0 ? (worlds[index + 1] ?? null) : null);
      })
      .catch(() => {
        // Optional: the completion banner renders without a next-world link.
      });
    return () => {
      cancelled = true;
    };
  }, [world, completionPercent]);

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

  const heldKeys = world.roomKeys.filter((key) => key.isHeld);
  const missingKeys = world.roomKeys.filter((key) => !key.isHeld);

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
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-5 text-sm">
          <span className="text-slate-400">World progress</span>
          <span className="font-bold text-cyan-200">{completionPercent}%</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-5 text-sm">
          <span className="text-slate-400">Reachable now</span>
          <span className="font-bold text-cyan-200">{world.reachablePercent}%</span>
        </div>
      </div>

      {completionPercent === 100 && (
        <div className="mb-6 rounded-2xl border border-amber-300/40 bg-amber-300/[.08] p-6 text-center">
          <p className="text-2xl font-black text-amber-200">ESCAPE COMPLETE</p>
          <p className="mt-2 text-sm text-slate-200">You cleared every room in {world.name}.</p>
          {nextWorld && (
            <Link
              to={`/worlds/${nextWorld.id}`}
              className="mt-4 inline-block font-bold text-cyan-200 hover:text-white"
            >
              Enter {nextWorld.name} →
            </Link>
          )}
        </div>
      )}

      {(heldKeys.length > 0 || missingKeys.length > 0) && (
        <section aria-label="Keys" className="mb-6">
          <h2 className="mb-2 text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">Keys</h2>
          <ul className="flex flex-wrap gap-2">
            {[...heldKeys, ...missingKeys].map((key) => (
              <li
                key={key.id}
                className={
                  key.isHeld
                    ? 'rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200'
                    : 'rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-xs text-slate-500'
                }
                title={key.isHeld ? 'Held' : 'Not found yet'}
              >
                {key.isHeld ? `${key.title} · held` : `${key.title} · missing`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        {world.levels.map((level, index) => {
          const progress = level.progress[0];
          const status = accessLabel(level);
          const lock = level.guardedByRoomLock;
          const canPlay = level.access === 'OPEN';
          return (
            <motion.article
              key={level.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className={
                canPlay
                  ? 'flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:flex-row sm:items-center sm:justify-between'
                  : 'flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between'
              }
            >
              <div className="flex gap-4">
                <span
                  className={
                    canPlay
                      ? 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 font-black text-cyan-200'
                      : 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 font-black text-slate-600'
                  }
                >
                  {level.access === 'LOCKED' ? '🔒' : level.number}
                </span>
                <div>
                  <h2 className={canPlay ? 'font-bold text-white' : 'font-bold text-slate-500'}>
                    {level.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">{level.description}</p>
                  {lock && (
                    <p className="mt-2 text-xs text-amber-200/90">
                      <span className="font-bold">{lock.title}</span> — {lock.prompt}
                      {level.access === 'LOCKED' && lock.requiresKey && (
                        <>
                          {' '}
                          Needs <span className="font-bold">{lock.requiresKey.title}</span>.
                        </>
                      )}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-amber-200">
                    +{level.xpReward} XP · {progress?.attempts ?? 0} attempts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:shrink-0">
                <span className={`text-sm font-bold ${status.className}`}>{status.text}</span>
                {canPlay ? (
                  level.challenge ? (
                    <Link
                      to={`/worlds/${worldId}/rooms/${String(level.number)}`}
                      onClick={() => {
                        trackEvent('level_start', {
                          worldId,
                          levelId: level.id,
                          slug: level.challenge?.slug,
                        });
                      }}
                      className="text-sm font-bold text-cyan-200 hover:text-white"
                    >
                      Enter room →
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-500">No challenge attached</span>
                  )
                ) : (
                  <span className="text-sm text-slate-600">—</span>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </PlayerPageShell>
  );
}
