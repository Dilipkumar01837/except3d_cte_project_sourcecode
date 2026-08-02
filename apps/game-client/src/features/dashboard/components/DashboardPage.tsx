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
  JOURNEYMAN: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  EXPERT: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  MASTER: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  GRANDMASTER: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

const WORLD_LABELS: Record<string, { label: string; emoji: string }> = {
  PYTHON_FOREST: { label: 'Python Forest', emoji: '🌿' },
  JAVASCRIPT_JUNGLE: { label: 'JavaScript Jungle', emoji: '🌴' },
  TYPESCRIPT_TUNDRA: { label: 'TypeScript Tundra', emoji: '❄️' },
  RUST_REALM: { label: 'Rust Realm', emoji: '⚙️' },
  GO_GALAXY: { label: 'Go Galaxy', emoji: '🚀' },
};

export function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const profile = user.profile;
  const xpForNextLevel = profile ? profile.level * 100 : 100;
  const xpProgress = profile ? Math.min(Math.round((profile.xp / xpForNextLevel) * 100), 100) : 0;
  const rank = profile?.rank ?? 'BEGINNER';
  const rankStyle = RANK_STYLES[rank] ?? RANK_STYLES['BEGINNER'];
  const world = WORLD_LABELS[profile?.currentWorld ?? ''] ?? {
    label: profile?.currentWorld ?? 'Unknown',
    emoji: '🌍',
  };
  const displayName = profile?.displayName ?? user.username;
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <PlayerPageShell
      eyebrow="Command center"
      title={`Welcome back, ${displayName}`}
      subtitle="Track your progress, claim daily rewards, and jump back into your next escape mission."
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
      >
        <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 text-2xl font-black text-slate-950 shadow-lg shadow-cyan-950/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-400">@{user.username}</p>
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
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-violet-400 transition-all duration-700"
                      style={{ width: `${String(xpProgress)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="flex flex-col justify-between p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
              Current world
            </p>
            <p className="mt-3 text-3xl">{world.emoji}</p>
            <p className="mt-2 text-xl font-bold text-white">{world.label}</p>
            <p className="mt-2 text-sm text-slate-400">
              Your active storyline and recommended missions live here.
            </p>
          </div>
          <Link
            to="/explore"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 transition hover:text-cyan-100"
          >
            Browse worlds <span aria-hidden="true">→</span>
          </Link>
        </GlassPanel>
      </motion.div>

      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatTile label="Level" value={profile.level} accent="cyan" />
          <StatTile label="Total XP" value={profile.xp.toLocaleString()} accent="violet" />
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

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <DailyRewardWidget />
        <GlassPanel>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
            Quick actions
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              to="/challenges"
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
            >
              <p className="font-bold text-white">Continue coding</p>
              <p className="mt-1 text-xs text-slate-400">Pick up where you left off</p>
            </Link>
            <Link
              to="/settings"
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-violet-300/30 hover:bg-white/[0.06]"
            >
              <p className="font-bold text-white">Account settings</p>
              <p className="mt-1 text-xs text-slate-400">Security and preferences</p>
            </Link>
          </div>
        </GlassPanel>
      </div>

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
