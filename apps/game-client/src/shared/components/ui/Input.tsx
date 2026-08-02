import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-xl border bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 transition ${
          error
            ? 'border-rose-400/50 focus:border-rose-400/50 focus:ring-rose-400/20'
            : 'border-white/10 focus:border-cyan-300/40 focus:ring-cyan-300/20'
        }`}
        {...props}
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
