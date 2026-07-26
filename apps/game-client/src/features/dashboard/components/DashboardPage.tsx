import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';

const RANK_COLORS: Record<string, string> = {
  BEGINNER: 'text-gray-400',
  NOVICE: 'text-green-400',
  APPRENTICE: 'text-blue-400',
  JOURNEYMAN: 'text-purple-400',
  EXPERT: 'text-yellow-400',
  MASTER: 'text-orange-400',
  GRANDMASTER: 'text-red-400',
};

const WORLD_LABELS: Record<string, string> = {
  PYTHON_FOREST: '🌿 Python Forest',
  JAVASCRIPT_JUNGLE: '🌴 JavaScript Jungle',
  TYPESCRIPT_TUNDRA: '❄️ TypeScript Tundra',
  RUST_REALM: '⚙️ Rust Realm',
  GO_GALAXY: '🚀 Go Galaxy',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
      <p className="text-xs text-brand-50/50 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-brand-50/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { user, loadUser } = useAuthStore();

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (!user) return null;

  const profile = user.profile;
  const xpForNextLevel = profile ? profile.level * 100 : 100;
  const xpProgress = profile ? Math.round((profile.xp / xpForNextLevel) * 100) : 0;
  const rankColor = RANK_COLORS[profile?.rank ?? 'BEGINNER'] ?? 'text-gray-400';

  return (
    <div className="min-h-screen bg-brand-900 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey, {profile?.displayName ?? user.username}! 👋
            </h1>
            <p className="text-sm text-brand-50/50">
              @{user.username} · <span className={rankColor}>{profile?.rank ?? 'BEGINNER'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/profile"
              className="rounded-lg border border-brand-500/30 px-4 py-2 text-sm text-brand-50/80 hover:bg-brand-500/10 transition-colors"
            >
              Profile
            </Link>
            <Link
              to="/settings"
              className="rounded-lg border border-brand-500/30 px-4 py-2 text-sm text-brand-50/80 hover:bg-brand-500/10 transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        {profile && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Level" value={profile.level} />
            <StatCard label="Total XP" value={profile.xp.toLocaleString()} />
            <StatCard label="Coins" value={`🪙 ${String(profile.coins)}`} />
            <StatCard label="Streak" value={`🔥 ${String(profile.codingStreak)}`} sub="days" />
          </div>
        )}

        {/* XP Progress */}
        {profile && (
          <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-brand-50/60">XP to Level {String(profile.level + 1)}</span>
              <span className="text-brand-50/80 font-medium">
                {String(profile.xp)} / {String(xpForNextLevel)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-brand-900/80 overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${String(Math.min(xpProgress, 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Current World */}
        {profile && (
          <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
            <p className="text-xs text-brand-50/50 uppercase tracking-wider mb-2">Current World</p>
            <p className="text-lg font-semibold text-white">
              {WORLD_LABELS[profile.currentWorld] ?? profile.currentWorld}
            </p>
          </div>
        )}

        {/* Account Info */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
          <p className="text-xs text-brand-50/50 uppercase tracking-wider mb-3">Account</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-50/50">Email</span>
              <span className="text-brand-50/80">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-50/50">Email Verified</span>
              <span className={user.emailVerified ? 'text-green-400' : 'text-yellow-400'}>
                {user.emailVerified ? '✓ Verified' : '⚠ Not Verified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-50/50">Auth Provider</span>
              <span className="text-brand-50/80">{user.authProvider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-50/50">Member Since</span>
              <span className="text-brand-50/80">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
