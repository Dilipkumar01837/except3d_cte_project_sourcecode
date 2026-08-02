import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '@/features/auth/store/admin-auth.store';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Overview', icon: '⬡' },
  { to: '/users', label: 'Users', icon: '◉' },
  { to: '/challenges', label: 'Challenges', icon: '◈' },
  { to: '/worlds', label: 'Worlds', icon: '◆' },
  { to: '/achievements', label: 'Achievements', icon: '◇' },
  { to: '/system', label: 'System', icon: '◎' },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    void navigate('/login', { replace: true });
  };

  const initials = (user?.profile?.displayName ?? user?.username ?? 'A').slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar — desktop */}
      <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
          <span className="font-black text-cyan-400">&lt;/&gt;</span>
          <span className="text-sm font-bold text-white">CTE Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-cyan-400/10 text-cyan-300 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-black text-slate-950">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-slate-200">{user?.username ?? '—'}</p>
              <p className="truncate text-[10px] text-slate-500">{user?.role ?? ''}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded px-2 py-1 text-xs text-slate-400 hover:text-rose-300 transition"
              aria-label="Log out"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
            }}
            className="rounded-lg border border-slate-700 p-1.5 text-slate-300"
            aria-label="Toggle navigation"
          >
            <span className="block h-0.5 w-4 bg-current mb-1" />
            <span className="block h-0.5 w-4 bg-current mb-1" />
            <span className="block h-0.5 w-4 bg-current" />
          </button>
          <span className="text-sm font-bold text-white">CTE Admin</span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-black text-slate-950"
            aria-expanded={profileOpen}
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
              <p className="px-3 py-1 text-sm font-semibold text-slate-200">{user?.username}</p>
              <p className="px-3 pb-2 text-xs text-slate-500">{user?.role}</p>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-400/10 transition"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => {
              setSidebarOpen(false);
            }}
            aria-hidden="true"
          />
          <nav className="absolute left-0 top-14 bottom-0 w-56 border-r border-slate-800 bg-slate-900 p-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => {
                  setSidebarOpen(false);
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                <span>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
