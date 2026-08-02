import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminUser } from '@/shared/lib/admin-api';

const ROLES = ['ALL', 'PLAYER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
const ROLE_BADGE: Record<string, string> = {
  PLAYER: 'bg-slate-700 text-slate-300',
  MODERATOR: 'bg-blue-500/20 text-blue-300',
  ADMIN: 'bg-violet-500/20 text-violet-300',
  SUPER_ADMIN: 'bg-amber-500/20 text-amber-300',
};

export function UserListPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listUsers({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
      })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch(() => {
        setError('Failed to load users.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search reset page
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleSuspend = async (id: string, active: boolean) => {
    if (!window.confirm(active ? 'Suspend this user?' : 'Reactivate this user?')) return;
    try {
      if (active) await adminApi.suspendUser(id);
      else await adminApi.reactivateUser(id);
      load();
    } catch {
      alert('Action failed.');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-slate-400">{String(total)} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Search username or email…"
          className="flex-1 min-w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50 transition placeholder:text-slate-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r === 'ALL' ? 'All roles' : r}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Level / XP
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Joined
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30 bg-slate-900/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-700 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{user.username}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.role] ?? 'bg-slate-700 text-slate-300'}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${user.isActive ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {user.profile
                      ? `Lv ${String(user.profile.level)} · ${String(user.profile.xp)} XP`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/users/${user.id}`}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSuspend(user.id, user.isActive);
                        }}
                        className={`text-xs ${user.isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                      >
                        {user.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {String(page)} of {String(totalPages)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
              }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
              }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
