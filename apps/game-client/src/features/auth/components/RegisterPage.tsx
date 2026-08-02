import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { AuthCard } from '@/shared/components/ui/AuthCard';
import { Input } from '@/shared/components/ui/Input';
import { FormButton } from '@/shared/components/ui/FormButton';

interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export function RegisterPage() {
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const onSubmit = (data: RegisterFormData) => {
    clearError();
    void registerUser({
      email: data.email,
      username: data.username,
      password: data.password,
      displayName: data.displayName || undefined,
    }).then(() => void navigate('/dashboard'));
  };

  return (
    <AuthCard title="Create Account" subtitle="Start your coding adventure today">
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
          id="displayName"
          label="Display Name"
          type="text"
          autoComplete="name"
          placeholder="Coder Hero"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <Input
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="coder_hero"
          error={errors.username?.message}
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 20, message: 'At most 20 characters' },
            pattern: {
              value: /^[a-zA-Z0-9_]+$/,
              message: 'Letters, numbers and underscores only',
            },
          })}
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
          })}
        />

        <FormButton type="submit" loading={isLoading}>
          Create Account
        </FormButton>

        <p className="text-center text-sm text-brand-50/60">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-500 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
