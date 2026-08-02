import { useEffect, useState } from 'react';
import { adminApi, type AdminAchievement } from '@/shared/lib/admin-api';

const CATEGORIES = ['CODING', 'EXPLORATION', 'SPEED', 'ACCURACY', 'STREAK', 'COLLECTION'];

const CAT_COLORS: Record<string, string> = {
  CODING: 'bg-cyan-500/20 text-cyan-300',
  EXPLORATION: 'bg-emerald-500/20 text-emerald-300',
  SPEED: 'bg-amber-500/20 text-amber-300',
  ACCURACY: 'bg-blue-500/20 text-blue-300',
  STREAK: 'bg-orange-500/20 text-orange-300',
  COLLECTION: 'bg-violet-500/20 text-violet-300',
};

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<AdminAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    adminApi
      .listAchievements()
      .then(({ achievements: a }) => {
        setAchievements(a);
      })
      .catch(() => {
        setError('Failed to load achievements.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const name = window.prompt('Achievement name:');
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const description = window.prompt('Description:') ?? '';
    const category = window.prompt(`Category (${CATEGORIES.join('/')}):`) ?? 'CODING';
    try {
      await adminApi.createAchievement({
        name,
        slug,
        description,
        category,
        target: 1,
        xpReward: 50,
        isHidden: false,
      });
      load();
    } catch {
      alert('Create failed.');
    }
  };

  const handleTogglePublish = async (id: string, isPublished: boolean) => {
    try {
      if (isPublished) await adminApi.unpublishAchievement(id);
      else await adminApi.publishAchievement(id);
      load();
    } catch {
      alert('Action failed.');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Achievements</h1>
          <p className="text-sm text-slate-400">{String(achievements.length)} total</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleCreate();
          }}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition"
        >
          + New Achievement
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Achievement
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                XP
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Unlocked by
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
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
            ) : achievements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No achievements yet.
                </td>
              </tr>
            ) : (
              achievements.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CAT_COLORS[a.category] ?? 'bg-slate-700 text-slate-300'}`}
                    >
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-300 text-xs">+{String(a.xpReward)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {String(a._count.players)} players
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${a.isPublished ? 'text-emerald-400' : 'text-slate-500'}`}
                    >
                      {a.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleTogglePublish(a.id, a.isPublished);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300"
                    >
                      {a.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
