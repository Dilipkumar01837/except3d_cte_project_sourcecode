import type { ReactNode } from 'react';

type MaxWidth = '2xl' | '4xl' | '7xl';

const maxWidthClass: Record<MaxWidth, string> = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
};

interface PlayerPageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  maxWidth?: MaxWidth;
  children: ReactNode;
}

export function PlayerPageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  maxWidth = '4xl',
  children,
}: PlayerPageShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-3rem)] overflow-hidden bg-ink-base text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="landing-grid absolute inset-0 opacity-25" />
      </div>
      <div
        className={`relative mx-auto ${maxWidthClass[maxWidth]} space-y-6 px-5 py-8 sm:px-6 lg:px-8`}
      >
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {eyebrow && (
              <p className="font-mono text-xs font-bold tracking-[0.12em] text-amber-400">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}
