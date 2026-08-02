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
      <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-[#050816]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-300/30 border-t-cyan-300" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
