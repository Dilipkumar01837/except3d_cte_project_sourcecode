import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { authApi } from '@/shared/lib/auth-api';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { GlassPanel, MetaRow, PanelHeading } from '@/shared/components/ui/player-ui';
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
    <PlayerPageShell
      eyebrow="Preferences"
      title="Settings"
      subtitle="Manage your account, session, and data on this device."
      maxWidth="2xl"
    >
      <GlassPanel className="p-6">
        <PanelHeading title="Account" description="Basic details tied to your escape profile." />
        <MetaRow label="Username" value={`@${user.username}`} />
        <MetaRow label="Email" value={user.email} />
        <MetaRow label="Sign-in method" value={user.authProvider} />
        <MetaRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
      </GlassPanel>

      <GlassPanel className="p-6">
        <PanelHeading
          title="Session"
          description="Sign out from this browser. Your progress stays saved on the server."
        />
        <FormButton variant="ghost" onClick={handleLogout} loading={loggingOut} fullWidth={false}>
          Sign out
        </FormButton>
      </GlassPanel>

      <GlassPanel className="border-rose-400/20 bg-rose-950/20 p-6">
        <PanelHeading
          title="Danger zone"
          description="Permanently delete your account and all associated game data. This cannot be undone."
        />
        {!showConfirm ? (
          <FormButton
            variant="danger"
            fullWidth={false}
            onClick={() => {
              setShowConfirm(true);
            }}
          >
            Delete account
          </FormButton>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-rose-200">
              Are you sure? This removes your profile, progress, and submissions.
            </p>
            <div className="flex flex-wrap gap-2">
              <FormButton
                variant="danger"
                fullWidth={false}
                loading={deleting}
                onClick={handleDeleteAccount}
              >
                Yes, delete everything
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
      </GlassPanel>
    </PlayerPageShell>
  );
}
