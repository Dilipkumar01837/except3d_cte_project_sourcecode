import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminChallenge } from '@/shared/lib/admin-api';

const DIFF_STYLE: Record<string, string> = {
  EASY: 'bg-emerald-500/20 text-emerald-300',
  MEDIUM: 'bg-amber-500/20 text-amber-300',
  HARD: 'bg-rose-500/20 text-rose-300',
};

export function AdminChallengeListPage() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listChallenges({
        page,
        limit: 20,
        search: search || undefined,
        difficulty: difficulty === 'ALL' ? undefined : difficulty,
      })
      .then((res) => {
        setChallenges(res.challenges);
        setTotal(res.total);
      })
      .catch(() => {
        setError('Failed to load challenges.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, search, difficulty]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, difficulty]);

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      if (isPublished) await adminApi.unpublishChallenge(id);
      else await adminApi.publishChallenge(id);
      load();
    } catch {
      alert('Action failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this challenge? This is irreversible if it has no submissions.'))
      return;
    try {
      await adminApi.deleteChallenge(id);
      load();
    } catch {
      alert('Delete failed.');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Challenges</h1>
          <p className="text-sm text-slate-400">{String(total)} total</p>
        </div>
        <Link
          to="/challenges/new"
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition"
        >
          + New Challenge
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Search challenges…"
          className="flex-1 min-w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/50 transition placeholder:text-slate-500"
        />
        {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setDifficulty(d);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${difficulty === d ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700 text-slate-400 hover:text-white'}`}
          >
            {d === 'ALL' ? 'All' : d}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Difficulty
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                XP
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Submissions
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30 bg-slate-900/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-700 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : challenges.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No challenges found.
                </td>
              </tr>
            ) : (
              challenges.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DIFF_STYLE[c.difficulty] ?? ''}`}
                    >
                      {c.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{String(c.xpReward)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${c.isPublished ? 'text-emerald-400' : 'text-slate-500'}`}
                    >
                      {c.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {String(c._count?.submissions ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/challenges/${c.id}/edit`}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          void handlePublish(c.id, c.isPublished);
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        {c.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDelete(c.id);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {String(page)} of {String(totalPages)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
              }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
              }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
