import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/shared/lib/auth-api';
import { AuthCard } from '@/shared/components/ui/AuthCard';
import { Input } from '@/shared/components/ui/Input';
import { FormButton } from '@/shared/components/ui/FormButton';

interface ResetFormData {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetFormData>();

  const onSubmit = (data: ResetFormData) => {
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    setLoading(true);
    setError(null);
    void authApi
      .resetPassword(token, data.password)
      .then(() => {
        setDone(true);
        setTimeout(() => void navigate('/login'), 2000);
      })
      .catch(() => {
        setError('Reset link is invalid or expired. Please request a new one.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (done) {
    return (
      <AuthCard title="Password Reset!" subtitle="Your password has been updated">
        <p className="text-center text-sm text-green-400">Redirecting you to sign in…</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset Password" subtitle="Choose a new secure password">
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

        <Input
          id="password"
          label="New Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
          })}
        />

        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (val) => val === watch('password') || 'Passwords do not match',
          })}
        />

        <FormButton type="submit" loading={loading}>
          Reset Password
        </FormButton>

        <p className="text-center text-sm text-brand-50/60">
          <Link to="/login" className="text-brand-500 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
