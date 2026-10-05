import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function GlassPanel({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-ink-border bg-ink-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = 'cyan',
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'cyan' | 'amber' | 'violet' | 'emerald';
}) {
  const valueClass = {
    cyan: 'text-amber-200',
    amber: 'text-amber-200',
    violet: 'text-amber-200',
    emerald: 'text-emerald-200',
  }[accent];

  return (
    <div className="rounded-lg border border-ink-border bg-ink-surface p-4 transition hover:border-amber-400/50 hover:bg-ink-elevated">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function PanelHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  );
}

export function ActionLink({
  to,
  children,
  variant = 'primary',
}: {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const styles =
    variant === 'primary'
      ? 'bg-amber-400 text-black hover:bg-amber-300'
      : 'border border-ink-border bg-ink-elevated text-slate-200 hover:border-amber-400/50';

  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-bold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}
