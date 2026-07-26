import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, accessToken, loadUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      void loadUser();
    }
  }, [accessToken, isAuthenticated, loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
