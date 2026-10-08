import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { DailyRewardWidget } from '@/features/daily-reward/components/DailyRewardWidget';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { ActionLink, GlassPanel, MetaRow, StatTile } from '@/shared/components/ui/player-ui';

const RANK_STYLES: Record<string, string> = {
  BEGINNER: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  NOVICE: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  APPRENTICE: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  JOURNEYMAN: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  EXPERT: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  MASTER: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  GRANDMASTER: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

interface WorldConfig {
  label: string;
  code: string;
  icon: string;
  gradient: string;
  accent: string;
  accentText: string;
}

const WORLD_CONFIGS: Record<string, WorldConfig> = {
  PYTHON_FOREST: {
    label: 'Python Forest',
    code: 'PY',
    icon: '🌿',
    gradient: 'linear-gradient(135deg, #041a0d 0%, #0a2e18 100%)',
    accent: '#34d399',
    accentText: 'text-emerald-300',
  },
  JAVASCRIPT_JUNGLE: {
    label: 'JavaScript Jungle',
    code: 'JS',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #050010 0%, #190070 100%)',
    accent: '#a78bfa',
    accentText: 'text-violet-300',
  },
  TYPESCRIPT_TUNDRA: {
    label: 'TypeScript Tundra',
    code: 'TS',
    icon: '❄️',
    gradient: 'linear-gradient(135deg, #020c1b 0%, #1e3a5f 100%)',
    accent: '#93c5fd',
    accentText: 'text-sky-300',
  },
  RUST_REALM: {
    label: 'Rust Realm',
    code: 'RS',
    icon: '🔥',
    gradient: 'linear-gradient(135deg, #0f0402 0%, #7c2d12 100%)',
    accent: '#fb923c',
    accentText: 'text-orange-300',
  },
  GO_GALAXY: {
    label: 'Go Galaxy',
    code: 'GO',
    icon: '🚀',
    gradient: 'linear-gradient(135deg, #000208 0%, #0f172a 100%)',
    accent: '#818cf8',
    accentText: 'text-indigo-300',
  },
};

const DEFAULT_WORLD: WorldConfig = {
  label: 'Unknown',
  code: '--',
  icon: '◈',
  gradient: 'linear-gradient(135deg, #0f1117 0%, #1c2333 100%)',
  accent: '#94a3b8',
  accentText: 'text-slate-300',
};

const QUICK_ACTIONS = [
  {
    to: '/challenges',
    title: 'Continue coding',
    desc: 'Pick up where you left off',
    hoverBorder: 'hover:border-cyan-300/30',
    hoverBg: 'hover:bg-white/[0.06]',
  },
  {
    to: '/leaderboard',
    title: 'View leaderboard',
    desc: 'Compare your escape score',
    hoverBorder: 'hover:border-amber-300/30',
    hoverBg: 'hover:bg-white/[0.06]',
  },
  {
    to: '/duels',
    title: 'Enter duel lobby',
    desc: 'Compete with another runner',
    hoverBorder: 'hover:border-violet-300/30',
    hoverBg: 'hover:bg-white/[0.06]',
  },
  {
    to: '/settings',
    title: 'Account settings',
    desc: 'Security and preferences',
    hoverBorder: 'hover:border-amber-400/50',
    hoverBg: 'hover:bg-ink-elevated',
  },
];

export function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const profile = user.profile;
  const xpForNextLevel = profile ? profile.level * 100 : 100;
  const xpProgress = profile ? Math.min(Math.round((profile.xp / xpForNextLevel) * 100), 100) : 0;
  const rank = profile?.rank ?? 'BEGINNER';
  const rankStyle = RANK_STYLES[rank] ?? RANK_STYLES['BEGINNER'] ?? 'border-slate-500/30';
  const world = WORLD_CONFIGS[profile?.currentWorld ?? ''] ?? {
    ...DEFAULT_WORLD,
    label: profile?.currentWorld ?? 'Unknown',
  };
  const displayName = profile?.displayName ?? user.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <PlayerPageShell
      eyebrow="Command center"
      title="Mission control"
      subtitle={`Run your next challenge, ${displayName}. Your active world and progress are ready.`}
      actions={
        <>
          <ActionLink to="/challenges">Play missions</ActionLink>
          <ActionLink to="/profile" variant="secondary">
            Edit profile
          </ActionLink>
        </>
      }
      maxWidth="7xl"
    >
      {/* ── Row 1: Player card + Current world ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
      >
        {/* Player card */}
        <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-xl font-black text-black"
              style={{ background: world.accent }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-slate-400">@{user.username}</p>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${rankStyle}`}
                >
                  {rank.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                Level {profile?.level ?? 1}{' '}
                <span className="text-base font-medium text-slate-400">· escape runner</span>
              </p>
              {profile && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs font-medium text-slate-400">
                    <span>Progress to level {profile.level + 1}</span>
                    <span className="text-slate-200">
                      {profile.xp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-white/10">
                    <div
                      className="h-full rounded-sm transition-all duration-700"
                      style={{ width: `${String(xpProgress)}%`, background: world.accent }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* Current world card — biome-styled */}
        <div
          className="relative flex flex-col justify-between overflow-hidden rounded-lg border p-6 transition"
          style={{ background: world.gradient, borderColor: world.accent + '40' }}
        >
          {/* large icon watermark */}
          <span
            className="pointer-events-none absolute right-4 top-3 text-6xl opacity-10 select-none"
            aria-hidden="true"
          >
            {world.icon}
          </span>
          <div className="relative">
            <p
              className={`font-mono text-xs font-bold uppercase tracking-[0.14em] ${world.accentText}`}
            >
              Current world
            </p>
            <p className="mt-3 font-mono text-4xl" style={{ color: world.accent }}>
              {world.code}
            </p>
            <p className="mt-2 text-xl font-bold text-white">{world.label}</p>
            <p className="mt-2 text-sm text-slate-400">
              Your active storyline and recommended missions live here.
            </p>
          </div>
          <Link
            to="/worlds"
            className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold transition hover:opacity-80"
            style={{ color: world.accent }}
          >
            Browse worlds <span aria-hidden="true">→</span>
          </Link>
        </div>
      </motion.div>

      {/* ── Row 2: Stat tiles ── */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatTile label="Level" value={profile.level} accent="cyan" />
          <StatTile label="Total XP" value={profile.xp.toLocaleString()} accent="amber" />
          <StatTile
            label="Coins"
            value={profile.coins.toLocaleString()}
            hint="Spend in future worlds"
            accent="amber"
          />
          <StatTile
            label="Streak"
            value={`${String(profile.codingStreak)}d`}
            hint="Daily coding streak"
            accent="emerald"
          />
        </motion.div>
      )}

      {/* ── Row 3: Daily reward + Quick actions ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <DailyRewardWidget />
        <GlassPanel>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            Quick actions
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 transition ${action.hoverBorder} ${action.hoverBg}`}
              >
                <p className="font-bold text-white">{action.title}</p>
                <p className="mt-1 text-xs text-slate-400">{action.desc}</p>
              </Link>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* ── Row 4: Account snapshot ── */}
      <GlassPanel>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Account snapshot
        </p>
        <div className="mt-2">
          <MetaRow label="Email" value={user.email} />
          <MetaRow
            label="Verification"
            value={
              user.emailVerified ? (
                <span className="text-emerald-300">Verified</span>
              ) : (
                <span className="text-amber-300">Pending</span>
              )
            }
          />
          <MetaRow label="Sign-in method" value={user.authProvider} />
          <MetaRow label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
        </div>
      </GlassPanel>
    </PlayerPageShell>
  );
}
