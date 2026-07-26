import { APP_NAME } from '@code-to-escape/shared';
import { Button } from '@code-to-escape/ui';

export function App() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Admin Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold">{APP_NAME}</h1>
        <p className="mt-4 text-slate-300">
          Administrative tools will be implemented on Day 9. The shell is ready for integration.
        </p>
        <div className="mt-8">
          <Button variant="secondary">Coming Soon</Button>
        </div>
      </div>
    </main>
  );
}
