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
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 focus:ring-cyan-300/30',
    ghost: 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 focus:ring-white/20',
    danger: 'bg-rose-500 text-white hover:bg-rose-400 focus:ring-rose-400/30',
  };

  return (
    <button
      disabled={loading ?? disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
