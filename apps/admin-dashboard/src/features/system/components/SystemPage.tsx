import { useEffect, useState } from 'react';
import { adminApi } from '@/shared/lib/admin-api';

interface SystemStatusData {
  services: Record<string, { ok: boolean; label: string }>;
  stats: {
    userCount: number;
    challengeCount: number;
    submissionCount: number;
    acceptedCount: number;
    successRate: number;
    recentSubmissionVolume: number;
    queuedCount: number;
  };
  queue: { depth: number };
  env: { nodeEnv: string; port: number; version: string };
  uptime: number;
}

function ServiceCard({ name, ok, label }: { name: string; ok: boolean; label: string }) {
  return (
    <div
      className={`rounded-xl border ${ok ? 'border-emerald-500/20' : 'border-red-500/20'} bg-slate-900 p-5`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        <span
          className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
        />
      </div>
      <p className={`mt-2 text-xs ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
        {ok ? 'Operational' : 'Unavailable'}
      </p>
      <p className="mt-1 text-xs text-slate-500 capitalize">{name}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{String(value)}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h)}h ${String(m)}m`;
  if (m > 0) return `${String(m)}m ${String(s)}s`;
  return `${String(s)}s`;
}

export function SystemPage() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = () => {
    setLoading(true);
    setError('');
    adminApi
      .getSystemStatus()
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load system status.');
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">System Status</h1>
          <p className="mt-1 text-sm text-slate-400">Live infrastructure and service health</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !status && <div className="text-sm text-slate-400">Loading…</div>}

      {status && (
        <>
          {/* Services */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Services</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(status.services).map(([name, svc]) => (
                <ServiceCard key={name} name={name} ok={svc.ok} label={svc.label} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Platform Statistics</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Users" value={status.stats.userCount.toLocaleString()} />
              <StatCard label="Challenges" value={status.stats.challengeCount.toLocaleString()} />
              <StatCard
                label="Total Submissions"
                value={status.stats.submissionCount.toLocaleString()}
              />
              <StatCard
                label="Success Rate"
                value={`${String(status.stats.successRate)}%`}
                sub={`${String(status.stats.acceptedCount)} accepted`}
              />
              <StatCard
                label="Last Hour Submissions"
                value={status.stats.recentSubmissionVolume.toLocaleString()}
                sub="past 60 min"
              />
              <StatCard
                label="In Queue / Running"
                value={status.stats.queuedCount.toLocaleString()}
              />
              <StatCard label="Queue Depth (Redis)" value={status.queue.depth} />
              <StatCard label="Uptime" value={formatUptime(status.uptime)} />
            </div>
          </div>

          {/* Environment */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Environment</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">NODE_ENV</dt>
                <dd className="font-medium text-slate-200">{status.env.nodeEnv}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">API Port</dt>
                <dd className="font-medium text-slate-200">{String(status.env.port)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Version</dt>
                <dd className="font-medium text-slate-200">{status.env.version}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">API Base</dt>
                <dd className="font-medium text-slate-200">/api/v1</dd>
              </div>
            </dl>
          </div>

          <p className="text-xs text-slate-600">Auto-refreshes every 30 seconds.</p>
        </>
      )}
    </div>
  );
}
