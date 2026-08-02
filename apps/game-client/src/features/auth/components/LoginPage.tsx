import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { AuthCard } from '@/shared/components/ui/AuthCard';
import { Input } from '@/shared/components/ui/Input';
import { FormButton } from '@/shared/components/ui/FormButton';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = (data: LoginFormData) => {
    clearError();
    void login(data.email, data.password).then(() => void navigate('/dashboard'));
  };

  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to continue your coding adventure">
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

        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-brand-500 hover:underline">
            Forgot password?
          </Link>
        </div>

        <FormButton type="submit" loading={isLoading}>
          Sign In
        </FormButton>

        <p className="text-center text-sm text-brand-50/60">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-brand-500 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
