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
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/25 backdrop-blur-sm ${className}`}
    >
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
    cyan: 'text-cyan-200',
    amber: 'text-amber-200',
    violet: 'text-violet-200',
    emerald: 'text-emerald-200',
  }[accent];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
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
      ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
      : 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10';

  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition ${styles}`}
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
