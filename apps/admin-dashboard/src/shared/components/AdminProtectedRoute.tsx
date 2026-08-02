import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '@/features/auth/store/admin-auth.store';

interface Props {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading, accessToken, user, loadUser } = useAdminAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      void loadUser();
    }
  }, [accessToken, isAuthenticated, loadUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Frontend role check (backend enforces this with 403, this is UX only)
  if (user && user.role === 'PLAYER') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
