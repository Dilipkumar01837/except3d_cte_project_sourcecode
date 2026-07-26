import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-900">
      <div className="w-full max-w-md rounded-2xl border border-brand-500/30 bg-brand-900/80 backdrop-blur p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-brand-50/60">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
