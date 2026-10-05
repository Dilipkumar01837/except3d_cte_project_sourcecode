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
import { ChallengeListPage } from '@/features/challenges/components/ChallengeListPage';
import { ChallengePlayerPage } from '@/features/challenges/components/ChallengePlayerPage';
import { WorldsPage } from '@/features/worlds/components/WorldsPage';
import { WorldLevelsPage } from '@/features/worlds/components/WorldLevelsPage';
import { EscapeRoomPage } from '@/features/escape-room/pages/EscapeRoomPage';
import { LeaderboardPage } from '@/features/leaderboard/components/LeaderboardPage';
import { DuelLobbyPage } from '@/features/duels/components/DuelLobbyPage';
import { DuelArenaPage } from '@/features/duels/components/DuelArenaPage';
import { AssessmentPage } from '@/features/assessments/components/AssessmentPage';
import { FriendsPage } from '@/features/social/components/FriendsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Public and protected routes share the app shell so the header,
          navigation, and account menu are always available. */}
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<ChallengeListPage />} />
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
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <ChallengeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worlds"
          element={
            <ProtectedRoute>
              <WorldsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worlds/:worldId"
          element={
            <ProtectedRoute>
              <WorldLevelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worlds/:worldId/rooms/:levelNumber"
          element={
            <ProtectedRoute>
              <EscapeRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/duels"
          element={
            <ProtectedRoute>
              <DuelLobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/duels/:duelId"
          element={
            <ProtectedRoute>
              <DuelArenaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments"
          element={
            <ProtectedRoute>
              <AssessmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges/:slug"
          element={
            <ProtectedRoute>
              <ChallengePlayerPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect /me to /dashboard */}
      <Route path="/me" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
