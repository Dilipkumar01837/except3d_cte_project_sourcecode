import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { authApi } from '@/shared/lib/auth-api';
import { AuthCard } from '@/shared/components/ui/AuthCard';
import { Input } from '@/shared/components/ui/Input';
import { FormButton } from '@/shared/components/ui/FormButton';

interface ForgotFormData {
  email: string;
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>();

  const onSubmit = (data: ForgotFormData) => {
    setLoading(true);
    setError(null);
    void authApi
      .forgotPassword(data.email)
      .then(() => {
        setSent(true);
      })
      .catch(() => {
        setError('Something went wrong. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (sent) {
    return (
      <AuthCard title="Check Your Email" subtitle="We've sent a password reset link">
        <p className="text-center text-sm text-slate-400">
          If an account with that email exists, you will receive a password reset email within a few
          minutes.
        </p>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-cyan-300 hover:text-cyan-200 text-sm">
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot Password" subtitle="Enter your email to reset your password">
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
            className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />

        <FormButton type="submit" loading={loading}>
          Send Reset Link
        </FormButton>

        <p className="text-center text-sm text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
