import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { GlassPanel, PanelHeading, StatTile } from '@/shared/components/ui/player-ui';
import { Input } from '@/shared/components/ui/Input';
import { FormButton } from '@/shared/components/ui/FormButton';

interface ProfileFormData {
  displayName: string;
  bio: string;
}

export function ProfilePage() {
  const { user, updateProfile, isLoading, error } = useAuthStore();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      displayName: user?.profile?.displayName ?? '',
      bio: user?.profile?.bio ?? '',
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    setSaved(false);
    void updateProfile({ displayName: data.displayName, bio: data.bio })
      .then(() => {
        setSaved(true);
        const timer = setTimeout(() => {
          setSaved(false);
        }, 3000);
        return () => {
          clearTimeout(timer);
        };
      })
      .catch(() => {
        // error shown via store
      });
  };

  if (!user) return null;

  const displayName = user.profile?.displayName ?? user.username;

  return (
    <PlayerPageShell
      eyebrow="Identity"
      title="Your profile"
      subtitle="How other players see you across missions, leaderboards, and your escape journey."
      maxWidth="2xl"
    >
      <GlassPanel className="flex items-center gap-5 p-6">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 text-xl font-black text-slate-950">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{displayName}</p>
          <p className="text-sm text-slate-400">@{user.username}</p>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <PanelHeading title="Edit profile" description="Update your public name and short bio." />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onSubmit)(e);
          }}
          className="flex flex-col gap-4"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              Profile updated successfully.
            </div>
          )}

          <Input
            id="displayName"
            label="Display name"
            type="text"
            error={errors.displayName?.message}
            {...register('displayName', { required: 'Display name is required' })}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="bio" className="text-sm font-medium text-slate-300">
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
              placeholder="Tell the community what you're building or learning…"
              {...register('bio', { maxLength: { value: 300, message: 'Max 300 characters' } })}
            />
            {errors.bio && <p className="text-xs text-rose-300">{errors.bio.message}</p>}
          </div>

          <FormButton type="submit" loading={isLoading}>
            Save changes
          </FormButton>
        </form>
      </GlassPanel>

      {user.profile && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Level" value={user.profile.level} accent="cyan" />
          <StatTile label="XP" value={user.profile.xp.toLocaleString()} accent="violet" />
          <StatTile label="Coins" value={user.profile.coins} accent="amber" />
          <StatTile
            label="Streak"
            value={`${String(user.profile.codingStreak)}d`}
            accent="emerald"
          />
        </div>
      )}
    </PlayerPageShell>
  );
}
