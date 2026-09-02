import { useEffect, useState } from 'react';
import {
  adminApi,
  type AdminChallenge,
  type AdminWorld,
  type AdminLevel,
} from '@/shared/lib/admin-api';

export function WorldsPage() {
  const [worlds, setWorlds] = useState<AdminWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [savingLevelId, setSavingLevelId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .listWorlds()
      .then(({ worlds: w }) => {
        setWorlds(w);
      })
      .catch(() => {
        setError('Failed to load worlds.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    adminApi
      .listChallenges({ page: 1, limit: 100 })
      .then(({ challenges: items }) => {
        setChallenges(items);
      })
      .catch(() => {
        setError('Failed to load challenges for level assignment.');
      });
  }, []);

  const assignChallenge = async (worldId: string, level: AdminLevel, challengeId: string) => {
    setSavingLevelId(level.id);
    try {
      await adminApi.updateLevel(worldId, level.id, {
        challengeId: challengeId || null,
      });
      load();
    } catch {
      setError('Failed to assign the challenge.');
    } finally {
      setSavingLevelId(null);
    }
  };

  const handleCreateWorld = async () => {
    const name = window.prompt('World name:');
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const description = window.prompt('Description:') ?? '';
    const sortOrder = worlds.length;
    try {
      await adminApi.createWorld({
        name,
        slug,
        description,
        sortOrder,
        difficulty: 1,
        requiredXp: 0,
        estimatedMinutes: 30,
      });
      load();
    } catch {
      alert('Create failed.');
    }
  };

  const handleDeleteWorld = async (id: string) => {
    if (!window.confirm('Delete world? This fails if players have progress.')) return;
    try {
      await adminApi.deleteWorld(id);
      load();
    } catch {
      alert('Delete failed — world may have player progress.');
    }
  };

  const handleCreateLevel = async (worldId: string, existingLevels: AdminLevel[]) => {
    const title = window.prompt('Level title:');
    if (!title) return;
    const desc = window.prompt('Description:') ?? '';
    const number = existingLevels.length + 1;
    try {
      await adminApi.createLevel(worldId, {
        number,
        title,
        description: desc,
        difficulty: 1,
        xpReward: 50,
      });
      load();
    } catch {
      alert('Failed to create level.');
    }
  };

  const handleDeleteLevel = async (worldId: string, levelId: string) => {
    if (!window.confirm('Delete level?')) return;
    try {
      await adminApi.deleteLevel(worldId, levelId);
      load();
    } catch {
      alert('Delete failed.');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Worlds & Levels</h1>
          <p className="text-sm text-slate-400">{String(worlds.length)} worlds</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleCreateWorld();
          }}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition"
        >
          + New World
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : worlds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
          No worlds yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {worlds.map((world) => (
            <div
              key={world.id}
              className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-800/50 transition"
                onClick={() => {
                  setExpanded(expanded === world.id ? null : world.id);
                }}
                aria-expanded={expanded === world.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setExpanded(expanded === world.id ? null : world.id);
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-white">{world.name}</h2>
                    <span
                      className={`text-xs font-medium ${world.isPublished ? 'text-emerald-400' : 'text-slate-500'}`}
                    >
                      {world.isPublished ? '● Published' : '○ Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {world.slug} · {String(world._count.levels)} levels · {String(world.requiredXp)}{' '}
                    XP required
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteWorld(world.id);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                  >
                    Delete
                  </button>
                  <span className="text-slate-500 text-xs">
                    {expanded === world.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expanded === world.id && (
                <div className="border-t border-slate-700/50 px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Levels
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateLevel(world.id, world.levels);
                      }}
                      className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      + Level
                    </button>
                  </div>
                  {world.levels.length === 0 ? (
                    <p className="text-xs text-slate-500">No levels yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {world.levels.map((level: AdminLevel) => (
                        <div
                          key={level.id}
                          className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-400 mr-2">
                              #{String(level.number)}
                            </span>
                            <span className="text-sm text-slate-200">{level.title}</span>
                            <span
                              className={`ml-2 text-xs ${level.isPublished ? 'text-emerald-400' : 'text-slate-500'}`}
                            >
                              {level.isPublished ? '● Published' : '○ Draft'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-300">
                              +{String(level.xpReward)} XP
                            </span>
                            <select
                              aria-label={`Challenge for level ${String(level.number)}`}
                              value={level.challengeId ?? ''}
                              disabled={savingLevelId === level.id}
                              onChange={(event) => {
                                void assignChallenge(world.id, level, event.target.value);
                              }}
                              className="max-w-52 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"
                            >
                              <option value="">No challenge assigned</option>
                              {challenges.map((challenge) => (
                                <option key={challenge.id} value={challenge.id}>
                                  {challenge.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeleteLevel(world.id, level.id);
                              }}
                              className="text-xs text-rose-400 hover:text-rose-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
