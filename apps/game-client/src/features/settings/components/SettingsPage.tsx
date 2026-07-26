import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { authApi } from '@/shared/lib/auth-api';
import { FormButton } from '@/shared/components/ui/FormButton';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    void logout()
      .then(() => void navigate('/login'))
      .finally(() => {
        setLoggingOut(false);
      });
  };

  const handleDeleteAccount = () => {
    setDeleting(true);
    void authApi
      .deleteAccount()
      .then(() => logout())
      .then(() => void navigate('/register'))
      .catch(() => {
        setDeleting(false);
        setShowConfirm(false);
      });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-900 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>

        {/* Account Info */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-brand-500/10">
              <span className="text-brand-50/50">Username</span>
              <span className="text-brand-50/80">@{user.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-500/10">
              <span className="text-brand-50/50">Email</span>
              <span className="text-brand-50/80">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-500/10">
              <span className="text-brand-50/50">Auth Method</span>
              <span className="text-brand-50/80">{user.authProvider}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-brand-50/50">Joined</span>
              <span className="text-brand-50/80">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Session */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Session</h2>
          <p className="text-sm text-brand-50/50 mb-4">
            Sign out from this device. Your progress will be saved.
          </p>
          <FormButton variant="ghost" onClick={handleLogout} loading={loggingOut} fullWidth={false}>
            Sign Out
          </FormButton>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-500/20 bg-red-900/10 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-brand-50/50 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          {!showConfirm ? (
            <FormButton
              variant="danger"
              fullWidth={false}
              onClick={() => {
                setShowConfirm(true);
              }}
            >
              Delete Account
            </FormButton>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400 font-medium">
                Are you absolutely sure? This action is irreversible.
              </p>
              <div className="flex gap-2">
                <FormButton
                  variant="danger"
                  fullWidth={false}
                  loading={deleting}
                  onClick={handleDeleteAccount}
                >
                  Yes, Delete Everything
                </FormButton>
                <FormButton
                  variant="ghost"
                  fullWidth={false}
                  onClick={() => {
                    setShowConfirm(false);
                  }}
                >
                  Cancel
                </FormButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
