import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { HomePage } from '@/features/home/components/HomePage';
import { NotFoundPage } from '@/features/not-found/components/NotFoundPage';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { RegisterPage } from '@/features/auth/components/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import { ProfilePage } from '@/features/profile/components/ProfilePage';
import { SettingsPage } from '@/features/settings/components/SettingsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes with full layout */}
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
      </Route>

      {/* Auth routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Redirect /me to /dashboard */}
      <Route path="/me" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
