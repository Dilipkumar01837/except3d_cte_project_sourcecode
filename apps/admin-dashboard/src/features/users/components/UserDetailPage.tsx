import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi, type AdminUser } from '@/shared/lib/admin-api';
import { useAdminAuthStore } from '@/features/auth/store/admin-auth.store';

const ROLE_OPTIONS = ['PLAYER', 'MODERATOR', 'ADMIN'];
const SUPER_ADMIN_OPTIONS = [...ROLE_OPTIONS, 'SUPER_ADMIN'];

const RANK_COLORS: Record<string, string> = {
  BEGINNER: 'text-slate-400',
  NOVICE: 'text-emerald-400',
  APPRENTICE: 'text-blue-400',
  JOURNEYMAN: 'text-purple-400',
  EXPERT: 'text-yellow-400',
  MASTER: 'text-orange-400',
  GRANDMASTER: 'text-rose-400',
};

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAdminAuthStore((s) => s.user);
  const [data, setData] = useState<{
    user: AdminUser;
    submissionCount: number;
    achievementCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleValue, setRoleValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    adminApi
      .getUser(id)
      .then((res) => {
        setData(res);
        setRoleValue(res.user.role);
      })
      .catch(() => {
        setError('Failed to load user.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async () => {
    if (!id || roleValue === data?.user.role) return;
    if (!window.confirm(`Change role to ${roleValue}?`)) return;
    setSaving(true);
    try {
      await adminApi.updateUserRole(id, roleValue);
      load();
    } catch {
      alert('Failed to update role.');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!id || !data) return;
    const active = data.user.isActive;
    if (!window.confirm(active ? 'Suspend this user?' : 'Reactivate this user?')) return;
    try {
      if (active) await adminApi.suspendUser(id);
      else await adminApi.reactivateUser(id);
      load();
    } catch {
      alert('Action failed.');
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );
  if (error || !data) return <div className="p-8 text-rose-300">{error || 'User not found.'}</div>;

  const { user, submissionCount, achievementCount } = data;
  const { profile } = user;
  const roleOptions = currentUser?.role === 'SUPER_ADMIN' ? SUPER_ADMIN_OPTIONS : ROLE_OPTIONS;

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Link to="/users" className="text-sm text-cyan-400 hover:text-cyan-300">
        ← Users
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xl font-black text-slate-950 flex-shrink-0">
          {(profile?.displayName ?? user.username).slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{profile?.displayName ?? user.username}</h1>
          <p className="text-sm text-slate-400">
            @{user.username} · {user.email}
          </p>
          <div className="mt-1 flex gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
            >
              {user.isActive ? 'Active' : 'Suspended'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900 p-3 text-center">
            <p className="text-lg font-bold text-white">{String(profile.level)}</p>
            <p className="text-xs text-slate-500">Level</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900 p-3 text-center">
            <p className="text-lg font-bold text-white">{String(profile.xp)}</p>
            <p className="text-xs text-slate-500">XP</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900 p-3 text-center">
            <p className={`text-lg font-bold ${RANK_COLORS[profile.rank] ?? 'text-white'}`}>
              {profile.rank}
            </p>
            <p className="text-xs text-slate-500">Rank</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900 p-3 text-center">
            <p className="text-lg font-bold text-white">{String(submissionCount)}</p>
            <p className="text-xs text-slate-500">Submissions</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900 p-3 text-center">
            <p className="text-lg font-bold text-white">{String(achievementCount)}</p>
            <p className="text-xs text-slate-500">Achievements</p>
          </div>
        </div>
      )}

      {/* Role management */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Role Management</h2>
        <div className="flex gap-2">
          <select
            value={roleValue}
            onChange={(e) => {
              setRoleValue(e.target.value);
            }}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving || roleValue === user.role}
            onClick={() => {
              void handleRoleChange();
            }}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40 hover:bg-cyan-300 transition"
          >
            {saving ? 'Saving…' : 'Update Role'}
          </button>
        </div>
      </div>

      {/* Account actions */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Account Actions</h2>
        <button
          type="button"
          onClick={() => {
            void handleSuspend();
          }}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${user.isActive ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
        >
          {user.isActive ? 'Suspend Account' : 'Reactivate Account'}
        </button>
      </div>
    </div>
  );
}
