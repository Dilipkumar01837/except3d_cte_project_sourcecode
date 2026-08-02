import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type OverviewStats } from '@/shared/lib/admin-api';

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5 animate-pulse">
      <div className="h-3 w-20 rounded bg-slate-700" />
      <div className="mt-3 h-7 w-16 rounded bg-slate-700" />
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: 'text-emerald-400',
  WRONG_ANSWER: 'text-rose-400',
  COMPILATION_ERROR: 'text-amber-400',
  RUNTIME_ERROR: 'text-orange-400',
  TIME_LIMIT_EXCEEDED: 'text-purple-400',
  QUEUED: 'text-slate-400',
  RUNNING: 'text-cyan-400',
};

export function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getOverview()
      .then(setStats)
      .catch(() => {
        setError('Failed to load statistics.');
      });
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Real-time platform statistics</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {!stats ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Active Users" value={stats.activeUsers} accent="text-emerald-400" />
            <StatCard
              label="Challenges"
              value={stats.totalChallenges}
              sub={`${String(stats.publishedChallenges)} published`}
            />
            <StatCard
              label="Submissions"
              value={stats.totalSubmissions}
              sub={`${String(stats.acceptedSubmissions)} accepted`}
            />
            <StatCard
              label="Success Rate"
              value={`${String(stats.successRate)}%`}
              accent={stats.successRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}
            />
            <StatCard
              label="Worlds"
              value={stats.totalWorlds}
              sub={`${String(stats.publishedWorlds)} published`}
            />
            <StatCard label="Levels" value={stats.totalLevels} />
            <StatCard label="Achievements" value={stats.totalAchievements} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Registrations */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Registrations</h2>
            <Link to="/users" className="text-xs text-cyan-400 hover:text-cyan-300">
              View all →
            </Link>
          </div>
          {!stats ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : stats.recentUsers.length === 0 ? (
            <p className="text-sm text-slate-500">No users yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentUsers.map((u) => (
                <Link
                  key={u.id}
                  to={`/users/${u.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-800 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{u.username}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold ${u.isActive ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                    <p className="text-xs text-slate-600">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Submissions</h2>
            <Link to="/challenges" className="text-xs text-cyan-400 hover:text-cyan-300">
              Challenges →
            </Link>
          </div>
          {!stats ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : stats.recentSubmissions.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentSubmissions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-800/50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{s.challenge.title}</p>
                    <p className="text-xs text-slate-500">by {s.user.username}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${STATUS_COLORS[s.status] ?? 'text-slate-400'}`}
                  >
                    {s.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System status */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">System Status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-300">API Server</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <Link to="/system" className="text-sm text-slate-300 hover:text-white">
              Full Status →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
