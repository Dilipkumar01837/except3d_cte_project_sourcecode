import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-center px-4">
      <p className="text-6xl font-black text-rose-900">403</p>
      <h1 className="mt-4 text-xl font-bold text-white">Unauthorized</h1>
      <p className="mt-2 text-sm text-slate-400">
        Your account does not have administrator access.
      </p>
      <Link
        to="/login"
        className="mt-6 rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition"
      >
        Sign in with a different account
      </Link>
    </div>
  );
}
