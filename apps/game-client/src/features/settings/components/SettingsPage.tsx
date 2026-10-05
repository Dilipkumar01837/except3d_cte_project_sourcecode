import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { authApi } from '@/shared/lib/auth-api';
import { getTelemetryConsent, setTelemetryConsent } from '@/shared/lib/telemetry-api';
import { applyTelemetryConsent } from '@/shared/lib/telemetry';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { GlassPanel, MetaRow, PanelHeading } from '@/shared/components/ui/player-ui';
import { FormButton } from '@/shared/components/ui/FormButton';
import {
  disablePushNotifications,
  enablePushNotifications,
  pushConfigured,
} from '@/shared/lib/push-notifications';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [telemetryOn, setTelemetryOn] = useState(false);
  const [savingTelemetry, setSavingTelemetry] = useState(false);
  const [telemetryLoaded, setTelemetryLoaded] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void getTelemetryConsent()
      .then((consent) => {
        setTelemetryOn(consent.optIn);
      })
      .catch(() => undefined)
      .finally(() => {
        setTelemetryLoaded(true);
      });
  }, []);

  const handleTelemetryToggle = () => {
    const next = !telemetryOn;
    setSavingTelemetry(true);
    void setTelemetryConsent(next)
      .then((consent) => {
        setTelemetryOn(consent.optIn);
        applyTelemetryConsent(consent);
      })
      .finally(() => {
        setSavingTelemetry(false);
      });
  };

  const handlePushToggle = () => {
    setPushBusy(true);
    void (
      pushOn
        ? disablePushNotifications().then(() => {
            setPushOn(false);
          })
        : enablePushNotifications().then(setPushOn)
    ).finally(() => {
      setPushBusy(false);
    });
  };

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
          title="Push notifications"
          description="Optional browser alerts for friend requests, chat, duel matches, and achievements when you are offline."
        />
        <FormButton
          variant="ghost"
          fullWidth={false}
          disabled={!pushConfigured() || pushBusy}
          onClick={handlePushToggle}
        >
          {pushOn ? 'Disable push notifications' : 'Enable push notifications'}
        </FormButton>
        {!pushConfigured() && (
          <p className="mt-3 text-xs text-slate-500">
            Push notifications are not configured for this environment.
          </p>
        )}
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

      <GlassPanel className="p-6">
        <PanelHeading
          title="Privacy"
          description="Optional, anonymous engagement telemetry. Off by default."
        />
        <p className="mb-4 text-sm leading-6 text-slate-400">
          When enabled, we record broad engagement events (for example, a challenge was opened or a
          hint was revealed) to understand how the game is used. We never store IP addresses or user
          agents, and these signals are never used to make claims about learning.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <FormButton
            variant="ghost"
            fullWidth={false}
            disabled={!telemetryLoaded || savingTelemetry}
            onClick={handleTelemetryToggle}
          >
            {telemetryOn ? 'Turn off telemetry' : 'Turn on telemetry'}
          </FormButton>
          <span className="text-sm text-slate-400">
            {telemetryOn ? 'Currently on' : 'Currently off'}
          </span>
          <p className="basis-full text-xs text-slate-500">
            You can withdraw at any time; withdrawing deletes your stored telemetry and research
            events.
          </p>
        </div>
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
