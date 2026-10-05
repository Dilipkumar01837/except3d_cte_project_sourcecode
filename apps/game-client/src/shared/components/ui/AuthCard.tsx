import type { ReactNode } from 'react';
import { APP_NAME } from '@code-to-escape/shared';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-base px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="landing-grid absolute inset-0 opacity-30" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
            <span className="text-amber-300">&gt;_</span> {APP_NAME}
          </p>
        </div>
        <div className="rounded-lg border border-ink-border bg-ink-surface p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
