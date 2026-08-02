import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/shared/components/layout/AdminLayout';
import { AdminProtectedRoute } from '@/shared/components/AdminProtectedRoute';
import { AdminLoginPage } from '@/features/auth/components/AdminLoginPage';
import { AdminNotFoundPage } from '@/features/not-found/components/NotFoundPage';
import { UnauthorizedPage } from '@/features/unauthorized/components/UnauthorizedPage';

// Lazy-load heavy admin pages for performance
const OverviewPage = lazy(() =>
  import('@/features/overview/components/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const UserListPage = lazy(() =>
  import('@/features/users/components/UserListPage').then((m) => ({ default: m.UserListPage })),
);
const UserDetailPage = lazy(() =>
  import('@/features/users/components/UserDetailPage').then((m) => ({ default: m.UserDetailPage })),
);
const AdminChallengeListPage = lazy(() =>
  import('@/features/challenges/components/ChallengeListPage').then((m) => ({
    default: m.AdminChallengeListPage,
  })),
);
const ChallengeFormPage = lazy(() =>
  import('@/features/challenges/components/ChallengeFormPage').then((m) => ({
    default: m.ChallengeFormPage,
  })),
);
const WorldsPage = lazy(() =>
  import('@/features/worlds/components/WorldsPage').then((m) => ({ default: m.WorldsPage })),
);
const AchievementsPage = lazy(() =>
  import('@/features/achievements/components/AchievementsPage').then((m) => ({
    default: m.AchievementsPage,
  })),
);
const SystemPage = lazy(() =>
  import('@/features/system/components/SystemPage').then((m) => ({ default: m.SystemPage })),
);

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
    </div>
  );
}

export function AdminRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected with layout — AdminProtectedRoute wraps AdminLayout which provides Outlet */}
      <Route
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <OverviewPage />
            </Suspense>
          }
        />
        <Route
          path="/users"
          element={
            <Suspense fallback={<PageFallback />}>
              <UserListPage />
            </Suspense>
          }
        />
        <Route
          path="/users/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <UserDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/challenges"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminChallengeListPage />
            </Suspense>
          }
        />
        <Route
          path="/challenges/new"
          element={
            <Suspense fallback={<PageFallback />}>
              <ChallengeFormPage />
            </Suspense>
          }
        />
        <Route
          path="/challenges/:id/edit"
          element={
            <Suspense fallback={<PageFallback />}>
              <ChallengeFormPage />
            </Suspense>
          }
        />
        <Route
          path="/worlds"
          element={
            <Suspense fallback={<PageFallback />}>
              <WorldsPage />
            </Suspense>
          }
        />
        <Route
          path="/achievements"
          element={
            <Suspense fallback={<PageFallback />}>
              <AchievementsPage />
            </Suspense>
          }
        />
        <Route
          path="/system"
          element={
            <Suspense fallback={<PageFallback />}>
              <SystemPage />
            </Suspense>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<AdminNotFoundPage />} />
    </Routes>
  );
}
