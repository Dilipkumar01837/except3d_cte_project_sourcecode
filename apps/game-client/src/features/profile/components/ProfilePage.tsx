import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/store/auth.store';
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

  return (
    <div className="min-h-screen bg-brand-900 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-white">Your Profile</h1>

        {/* Avatar placeholder */}
        <div className="flex items-center gap-4 rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
          <div className="h-16 w-16 rounded-full bg-brand-500/30 flex items-center justify-center text-2xl font-bold text-brand-500">
            {(user.profile?.displayName ?? user.username)[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{user.profile?.displayName ?? user.username}</p>
            <p className="text-sm text-brand-50/50">@{user.username}</p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Edit Profile</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit(onSubmit)(e);
            }}
            className="flex flex-col gap-4"
          >
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
                Profile updated successfully!
              </div>
            )}

            <Input
              id="displayName"
              label="Display Name"
              type="text"
              error={errors.displayName?.message}
              {...register('displayName', { required: 'Display name is required' })}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="bio" className="text-sm font-medium text-brand-50/80">
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                className="rounded-lg border border-brand-500/30 px-3 py-2 bg-brand-900/60 text-brand-50 placeholder-brand-50/40 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors resize-none"
                placeholder="Tell us about yourself..."
                {...register('bio', { maxLength: { value: 300, message: 'Max 300 characters' } })}
              />
              {errors.bio && <p className="text-xs text-red-400">{errors.bio.message}</p>}
            </div>

            <FormButton type="submit" loading={isLoading}>
              Save Changes
            </FormButton>
          </form>
        </div>

        {/* Game Stats */}
        {user.profile && (
          <div className="rounded-xl border border-brand-500/20 bg-brand-900/60 p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Game Stats</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              {[
                { label: 'Level', value: String(user.profile.level) },
                { label: 'XP', value: String(user.profile.xp) },
                { label: 'Coins', value: String(user.profile.coins) },
                { label: 'Streak', value: `${String(user.profile.codingStreak)}d` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-brand-500/10 bg-brand-900/40 p-3"
                >
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-brand-50/40 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
