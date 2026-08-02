import type { ReactNode } from 'react';
import { APP_NAME } from '@code-to-escape/shared';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="landing-grid absolute inset-0 opacity-30" />
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            <span className="text-cyan-200">&lt;/&gt;</span> {APP_NAME}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
