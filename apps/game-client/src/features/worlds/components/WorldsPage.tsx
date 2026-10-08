import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { worldApi, type WorldSummary } from '../lib/world-api';

// ─── Per-biome visual config ─────────────────────────────────────────────────

interface BiomeStyle {
  gradient: string;
  accent: string;
  badge: string;
  badgeBg: string;
  icon: string;
  lockIcon: string;
  progressColor: string;
  borderUnlocked: string;
  borderLocked: string;
}

const BIOME_STYLES: Record<string, BiomeStyle> = {
  'python-forest': {
    gradient: 'linear-gradient(135deg, #041a0d 0%, #0a2e18 50%, #113d26 100%)',
    accent: '#34d399',
    badge: 'text-emerald-300',
    badgeBg: 'bg-emerald-950/80 border-emerald-400/30',
    icon: '🌿',
    lockIcon: '🔒',
    progressColor: 'from-emerald-400 to-teal-300',
    borderUnlocked: 'border-emerald-400/30',
    borderLocked: 'border-emerald-900/30',
  },
  'javascript-jungle': {
    gradient: 'linear-gradient(135deg, #050010 0%, #0d0040 50%, #190070 100%)',
    accent: '#a78bfa',
    badge: 'text-violet-300',
    badgeBg: 'bg-violet-950/80 border-violet-400/30',
    icon: '⚡',
    lockIcon: '🔒',
    progressColor: 'from-violet-400 to-cyan-300',
    borderUnlocked: 'border-violet-400/30',
    borderLocked: 'border-violet-900/30',
  },
  'typescript-tundra': {
    gradient: 'linear-gradient(135deg, #020c1b 0%, #0c2340 50%, #1e3a5f 100%)',
    accent: '#93c5fd',
    badge: 'text-sky-300',
    badgeBg: 'bg-sky-950/80 border-sky-400/30',
    icon: '❄️',
    lockIcon: '🔒',
    progressColor: 'from-sky-400 to-blue-300',
    borderUnlocked: 'border-sky-400/30',
    borderLocked: 'border-sky-900/30',
  },
  'rust-realm': {
    gradient: 'linear-gradient(135deg, #0f0402 0%, #3b1108 50%, #7c2d12 100%)',
    accent: '#fb923c',
    badge: 'text-orange-300',
    badgeBg: 'bg-orange-950/80 border-orange-400/30',
    icon: '🔥',
    lockIcon: '🔒',
    progressColor: 'from-orange-400 to-red-400',
    borderUnlocked: 'border-orange-400/30',
    borderLocked: 'border-orange-900/30',
  },
  'go-galaxy': {
    gradient: 'linear-gradient(135deg, #000208 0%, #060d1f 50%, #0f172a 100%)',
    accent: '#818cf8',
    badge: 'text-indigo-300',
    badgeBg: 'bg-indigo-950/80 border-indigo-400/30',
    icon: '🚀',
    lockIcon: '🔒',
    progressColor: 'from-indigo-400 to-purple-300',
    borderUnlocked: 'border-indigo-400/30',
    borderLocked: 'border-indigo-900/30',
  },
};

const DEFAULT_BIOME: BiomeStyle = {
  gradient: 'linear-gradient(135deg, #0f1117 0%, #1c2333 100%)',
  accent: '#94a3b8',
  badge: 'text-slate-300',
  badgeBg: 'bg-slate-800/80 border-slate-500/30',
  icon: '◈',
  lockIcon: '◌',
  progressColor: 'from-cyan-300 to-violet-400',
  borderUnlocked: 'border-cyan-300/25',
  borderLocked: 'border-white/10',
};

function difficultyDots(level: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={`inline-block h-1.5 w-3 rounded-full ${i < level ? 'bg-current' : 'bg-white/10'}`}
    />
  ));
}

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
          const unlocked = (world.progress[0]?.isUnlocked ?? false) || playerXp >= world.requiredXp;
          const biome = BIOME_STYLES[world.slug] ?? DEFAULT_BIOME;

          return (
            <motion.article
              key={world.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={`relative overflow-hidden rounded-2xl border transition hover:scale-[1.015] ${unlocked ? biome.borderUnlocked : biome.borderLocked} ${unlocked ? '' : 'opacity-80'}`}
              style={{ background: biome.gradient }}
            >
              {/* Biome icon watermark */}
              <span
                className="pointer-events-none absolute right-4 top-3 text-5xl opacity-10 select-none"
                aria-hidden="true"
              >
                {biome.icon}
              </span>

              <div className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-[.18em] ${biome.badge}`}>
                      World {String(index + 1)}
                    </p>
                    <h2 className="mt-1.5 text-xl font-black text-white">{world.name}</h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${biome.badgeBg} ${biome.badge}`}
                  >
                    {unlocked ? biome.icon + ' Unlocked' : '🔒 Locked'}
                  </span>
                </div>

                <p className="mt-3 min-h-10 text-sm leading-6 text-slate-400">
                  {world.description}
                </p>

                {/* Difficulty dots */}
                <div className={`mt-4 flex items-center gap-1.5 text-xs ${biome.badge}`}>
                  <span className="mr-1 text-slate-500 uppercase tracking-widest text-[10px]">
                    Difficulty
                  </span>
                  {difficultyDots(world.difficulty)}
                </div>

                {/* Stats row */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    📚 <span>{world._count.levels} levels</span>
                  </span>
                  <span className="flex items-center gap-1">
                    ⏱ <span>{world.estimatedMinutes} min</span>
                  </span>
                  <span className="flex items-center gap-1">
                    ✨ <span>{world.requiredXp} XP</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${biome.progressColor}`}
                    style={{ width: `${String(progress)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px]">
                  <span className={progress > 0 ? biome.badge : 'text-slate-600'}>
                    {progress > 0 ? `${String(progress)}% complete` : 'Not started'}
                  </span>
                  {progress === 100 && (
                    <span className="text-emerald-400 font-bold">✓ Completed</span>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-5">
                  {unlocked ? (
                    <Link
                      to={`/worlds/${world.id}`}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-black transition hover:opacity-90`}
                      style={{ background: biome.accent }}
                    >
                      {progress > 0 ? 'Continue' : 'Enter world'} <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Earn{' '}
                      <span className="font-bold text-amber-300">
                        {world.requiredXp - playerXp} more XP
                      </span>{' '}
                      to unlock this world.
                    </p>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </PlayerPageShell>
  );
}
