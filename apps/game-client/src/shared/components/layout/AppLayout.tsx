import { Outlet, Link } from 'react-router-dom';
import { APP_NAME } from '@code-to-escape/shared';
import { useAuthStore } from '@/features/auth/store/auth.store';

export function AppLayout() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-brand-500/30 bg-brand-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-wide text-brand-50 hover:text-white transition-colors"
          >
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-brand-50/70 hover:text-brand-50 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-brand-50/70 hover:text-brand-50 transition-colors"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="text-brand-50/70 hover:text-brand-50 transition-colors"
                >
                  Settings
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-brand-50/70 hover:text-brand-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-500 px-4 py-1.5 text-white hover:bg-brand-500/90 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
