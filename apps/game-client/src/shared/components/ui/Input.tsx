import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-brand-50/80">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-lg border px-3 py-2 bg-brand-900/60 text-brand-50 placeholder-brand-50/40 focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-500/40'
            : 'border-brand-500/30 focus:ring-brand-500/40'
        }`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
