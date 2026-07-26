import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

export function FormButton({
  children,
  loading,
  variant = 'primary',
  fullWidth = true,
  className = '',
  disabled,
  ...props
}: FormButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-500/90 focus:ring-brand-500/40',
    ghost:
      'border border-brand-500/30 text-brand-50/80 hover:bg-brand-500/10 focus:ring-brand-500/30',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40',
  };

  return (
    <button
      disabled={loading ?? disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
