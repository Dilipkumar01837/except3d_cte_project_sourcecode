import { Link } from 'react-router-dom';

export function AdminNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-center px-4">
      <p className="text-6xl font-black text-slate-700">404</p>
      <h1 className="mt-4 text-xl font-bold text-white">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-400">The page you are looking for does not exist.</p>
      <Link
        to="/dashboard"
        className="mt-6 rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
