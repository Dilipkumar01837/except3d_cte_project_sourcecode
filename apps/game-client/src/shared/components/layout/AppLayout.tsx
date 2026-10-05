import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@code-to-escape/shared';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { initTelemetry, resetTelemetry } from '@/shared/lib/telemetry';
import { listenForForegroundPush } from '@/shared/lib/push-notifications';

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
  { to: '/friends', label: 'Friends' },
];

const commandLinks = [
  { to: '/dashboard', label: 'Open dashboard', shortcut: 'G D' },
  { to: '/worlds', label: 'Browse worlds', shortcut: 'G W' },
  { to: '/duels', label: 'Enter duel lobby', shortcut: 'G D' },
  { to: '/leaderboard', label: 'View leaderboard', shortcut: 'G L' },
  { to: '/friends', label: 'Open social', shortcut: '' },
  { to: '/settings', label: 'Open settings', shortcut: '' },
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const links = isAuthenticated ? privateLinks : publicLinks;
  const initials = (user?.profile?.displayName ?? user?.username ?? 'P').slice(0, 1).toUpperCase();
  const userId = user?.id;

  useEffect(() => {
    if (isAuthenticated && userId) {
      void initTelemetry(userId);
    } else {
      resetTelemetry();
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let unsubscribe: () => void = () => {};
    void listenForForegroundPush((payload) => {
      window.dispatchEvent(new CustomEvent('cte:notification', { detail: payload }));
      if (Notification.permission === 'granted' && payload.notification)
        new Notification(payload.notification.title ?? 'Code to Escape', {
          body: payload.notification.body,
        });
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const finishLogout = async (): Promise<void> => {
    await logout();
    setConfirmingLogout(false);
    setProfileOpen(false);
    void navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-base text-slate-100">
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cyan-300 focus:px-4 focus:py-2 focus:font-bold focus:text-slate-950"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-ink-border bg-ink-base/95">
        <div className="flex h-12 items-center justify-between px-4">
          <Link to="/" className="font-black tracking-tight text-white">
            <span className="mr-2 font-mono text-amber-400">&gt;_</span>
            {APP_NAME}
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-5 md:flex">
            {links.map((link) => (
              <NavigationLink key={link.to} {...link} />
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setCommandOpen(true)}
                  className="hidden items-center gap-2 rounded-md border border-ink-border bg-ink-surface px-3 py-1.5 text-xs text-zinc-400 hover:border-amber-400/60 hover:text-zinc-100 lg:flex"
                  aria-label="Open command palette"
                >
                  Search{' '}
                  <kbd className="rounded border border-ink-strong px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Account menu"
                    aria-expanded={profileOpen}
                    onClick={() => {
                      setProfileOpen((open) => !open);
                    }}
                    className="flex items-center gap-2 rounded-md border border-ink-border bg-ink-surface py-1 pl-1 pr-3 text-sm transition hover:border-amber-400/50"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded bg-amber-400 text-xs font-black text-black">
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
                        className="absolute right-0 mt-2 w-64 rounded-lg border border-ink-border bg-ink-elevated p-2"
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
              </>
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
      {isAuthenticated && (
        <aside className="fixed bottom-0 left-0 top-12 z-30 hidden w-56 border-r border-ink-border bg-ink-surface px-3 py-4 lg:block">
          <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Workspace
          </p>
          <nav aria-label="Workspace navigation" className="space-y-1">
            {privateLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-amber-400/10 text-amber-300' : 'text-zinc-400 hover:bg-ink-elevated hover:text-zinc-100'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 border-t border-ink-border pt-4">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs text-zinc-500 hover:bg-ink-elevated hover:text-zinc-200"
            >
              <span>Command palette</span>
              <kbd className="font-mono">⌘K</kbd>
            </button>
          </div>
        </aside>
      )}
      <main id="main-content" tabIndex={-1} className={isAuthenticated ? 'lg:pl-56' : ''}>
        <Outlet />
      </main>
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-start bg-black/60 p-4 pt-[14vh] backdrop-blur-sm"
            onMouseDown={() => setCommandOpen(false)}
          >
            <motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              className="w-full max-w-xl rounded-lg border border-ink-strong bg-ink-elevated p-2"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="border-b border-ink-border px-3 py-3">
                <h2
                  id="command-title"
                  className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500"
                >
                  Command palette
                </h2>
                <p className="mt-1 text-sm text-zinc-300">Jump to a workspace destination.</p>
              </div>
              <div className="mt-2 space-y-1">
                {commandLinks.map((link) => (
                  <button
                    key={link.to}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-amber-400/10 hover:text-amber-200"
                    onClick={() => {
                      setCommandOpen(false);
                      void navigate(link.to);
                    }}
                  >
                    <span>{link.label}</span>
                    {link.shortcut && (
                      <kbd className="font-mono text-[10px] text-zinc-500">{link.shortcut}</kbd>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
              className="w-full max-w-sm rounded-lg border border-ink-strong bg-ink-elevated p-6"
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
