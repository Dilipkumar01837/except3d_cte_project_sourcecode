import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@code-to-escape/shared';
import { useAuthStore } from '@/features/auth/store/auth.store';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
];
const privateLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/worlds', label: 'Worlds' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/duels', label: 'Duels' },
  { to: '/explore', label: 'Explore' },
  { to: '/challenges', label: 'Challenges' },
];

function NavigationLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      onClick={onClick}
      to={to}
      className={({ isActive }) =>
        `text-sm transition ${isActive ? 'text-cyan-200' : 'text-slate-300 hover:text-white'}`
      }
    >
      {label}
    </NavLink>
  );
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const links = isAuthenticated ? privateLinks : publicLinks;
  const initials = (user?.profile?.displayName ?? user?.username ?? 'P').slice(0, 1).toUpperCase();

  const finishLogout = async (): Promise<void> => {
    await logout();
    setConfirmingLogout(false);
    setProfileOpen(false);
    void navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cyan-300 focus:px-4 focus:py-2 focus:font-bold focus:text-slate-950"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link to="/" className="font-black tracking-tight text-white">
            <span className="mr-2 text-cyan-300">&lt;/&gt;</span>
            {APP_NAME}
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <NavigationLink key={link.to} {...link} />
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={profileOpen}
                  onClick={() => {
                    setProfileOpen((open) => !open);
                  }}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-sm transition hover:bg-white/10"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 text-xs font-black text-slate-950">
                    {initials}
                  </span>
                  <span className="max-w-28 truncate">{user?.username}</span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur"
                    >
                      <div className="border-b border-white/10 px-3 py-2">
                        <p className="font-semibold">
                          {user?.profile?.displayName ?? user?.username}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Level {user?.profile?.level ?? 1} · {user?.profile?.xp ?? 0} XP
                        </p>
                      </div>
                      <Link
                        onClick={() => {
                          setProfileOpen(false);
                        }}
                        to="/dashboard"
                        className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                      >
                        Dashboard
                      </Link>
                      <Link
                        onClick={() => {
                          setProfileOpen(false);
                        }}
                        to="/profile"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                      >
                        Profile
                      </Link>
                      <Link
                        onClick={() => {
                          setProfileOpen(false);
                        }}
                        to="/settings"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingLogout(true);
                        }}
                        className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-400/10"
                      >
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-300 transition hover:text-white">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
                >
                  Start playing
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            className="rounded-lg border border-white/10 p-2 md:hidden"
          >
            <span className="block h-0.5 w-5 bg-slate-200" />
            <span className="mt-1 block h-0.5 w-5 bg-slate-200" />
            <span className="mt-1 block h-0.5 w-5 bg-slate-200" />
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10 bg-slate-950 px-5 py-4 md:hidden"
            >
              <div className="flex flex-col gap-4">
                {links.map((link) => (
                  <NavigationLink
                    key={link.to}
                    {...link}
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                  />
                ))}
                {isAuthenticated ? (
                  <>
                    <Link
                      onClick={() => {
                        setMenuOpen(false);
                      }}
                      to="/profile"
                      className="text-sm text-slate-300"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmingLogout(true);
                      }}
                      className="text-left text-sm text-rose-300"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <Link
                      onClick={() => {
                        setMenuOpen(false);
                      }}
                      to="/login"
                      className="text-sm text-slate-300"
                    >
                      Log in
                    </Link>
                    <Link
                      onClick={() => {
                        setMenuOpen(false);
                      }}
                      to="/register"
                      className="text-sm font-bold text-cyan-200"
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <AnimatePresence>
        {confirmingLogout && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 12, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            >
              <h2 id="logout-title" className="text-xl font-bold">
                End this session?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                You will be returned to the landing page. Your session can be restored by signing in
                again.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingLogout(false);
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void finishLogout()}
                  className="rounded-lg bg-rose-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-rose-300"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
