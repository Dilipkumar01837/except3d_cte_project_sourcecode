import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  adminApi,
  type AdminChallenge,
  type ChallengeTestCase,
  type ChallengeHint,
} from '@/shared/lib/admin-api';

const LANGUAGES = ['PYTHON', 'JAVA', 'JAVASCRIPT', 'TYPESCRIPT', 'CPP', 'GO', 'RUST'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const TYPES = [
  'ALGORITHMS',
  'DATA_STRUCTURES',
  'DEBUGGING',
  'OUTPUT_PREDICTION',
  'FILL_IN_THE_BLANK',
  'CODE_COMPLETION',
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ChallengeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState<Partial<AdminChallenge>>({
    title: '',
    slug: '',
    statement: '',
    constraints: '',
    difficulty: 'EASY',
    type: 'ALGORITHMS',
    tags: [],
    supportedLanguages: [],
    xpReward: 100,
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    isPublished: false,
    starterCode: {},
  });
  const [testCases, setTestCases] = useState<ChallengeTestCase[]>([]);
  const [hints, setHints] = useState<ChallengeHint[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    adminApi
      .getChallenge(id)
      .then(({ challenge }) => {
        setForm(challenge);
        setTestCases(challenge.testCases ?? []);
        setHints(challenge.hints ?? []);
      })
      .catch(() => {
        setError('Failed to load challenge.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isEdit]);

  const set = (key: keyof AdminChallenge, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleTitleChange = (val: string) => {
    set('title', val);
    if (!isEdit) set('slug', generateSlug(val));
  };

  const toggleLanguage = (lang: string) => {
    const current = form.supportedLanguages ?? [];
    set(
      'supportedLanguages',
      current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang],
    );
  };

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await adminApi.updateChallenge(id, form);
      } else {
        const result = await adminApi.createChallenge(form);
        void navigate(`/challenges/${result.challenge.id}/edit`, { replace: true });
        return;
      }
      setSaving(false);
    } catch {
      setError('Save failed. Check all required fields.');
      setSaving(false);
    }
  };

  // Test case management
  const handleAddTestCase = async () => {
    if (!isEdit || !id) {
      alert('Save the challenge first.');
      return;
    }
    const input = window.prompt('Input:') ?? '';
    const expectedOutput = window.prompt('Expected output:') ?? '';
    if (!expectedOutput) return;
    const hidden = window.confirm('Is this a hidden test case?');
    try {
      const { testCase } = await adminApi.addTestCase(id, {
        input,
        expectedOutput,
        isHidden: hidden,
        weight: 1,
        sortOrder: testCases.length,
      });
      setTestCases((prev) => [...prev, testCase]);
    } catch {
      alert('Failed to add test case.');
    }
  };

  const handleDeleteTestCase = async (tcId: string) => {
    if (!id || !window.confirm('Delete this test case?')) return;
    try {
      await adminApi.deleteTestCase(id, tcId);
      setTestCases((prev) => prev.filter((tc) => tc.id !== tcId));
    } catch {
      alert('Failed to delete.');
    }
  };

  const handleAddHint = async () => {
    if (!isEdit || !id) {
      alert('Save the challenge first.');
      return;
    }
    const content = window.prompt('Hint content:') ?? '';
    if (!content) return;
    const level = hints.length + 1;
    try {
      const { hint } = await adminApi.addHint(id, { level, content, xpPenalty: 0 });
      setHints((prev) => [...prev, hint]);
    } catch {
      alert('Failed to add hint.');
    }
  };

  const handleDeleteHint = async (hintId: string) => {
    if (!id || !window.confirm('Delete this hint?')) return;
    try {
      await adminApi.deleteHint(id, hintId);
      setHints((prev) => prev.filter((h) => h.id !== hintId));
    } catch {
      alert('Failed to delete.');
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Link to="/challenges" className="text-sm text-cyan-400 hover:text-cyan-300">
        ← Challenges
      </Link>
      <h1 className="text-xl font-bold text-white">
        {isEdit ? 'Edit Challenge' : 'New Challenge'}
      </h1>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          void handleSave(e);
        }}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Title</label>
            <input
              required
              value={form.title ?? ''}
              onChange={(e) => {
                handleTitleChange(e.target.value);
              }}
              className="input"
              placeholder="Two Sum"
            />
          </div>
          <div>
            <label className="label">Slug</label>
            <input
              required
              value={form.slug ?? ''}
              onChange={(e) => {
                set('slug', e.target.value);
              }}
              className="input font-mono text-xs"
              placeholder="two-sum"
            />
          </div>
        </div>

        <div>
          <label className="label">Statement</label>
          <textarea
            required
            rows={6}
            value={form.statement ?? ''}
            onChange={(e) => {
              set('statement', e.target.value);
            }}
            className="input resize-y"
            placeholder="Given an array of integers…"
          />
        </div>

        <div>
          <label className="label">Constraints</label>
          <textarea
            rows={2}
            value={form.constraints ?? ''}
            onChange={(e) => {
              set('constraints', e.target.value);
            }}
            className="input resize-y"
            placeholder="1 ≤ n ≤ 10^5"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => {
                set('difficulty', e.target.value);
              }}
              className="input"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              value={form.type}
              onChange={(e) => {
                set('type', e.target.value);
              }}
              className="input"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">XP Reward</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={form.xpReward ?? 100}
              onChange={(e) => {
                set('xpReward', Number(e.target.value));
              }}
              className="input"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Time Limit (ms)</label>
            <input
              type="number"
              min={500}
              max={30000}
              value={form.timeLimitMs ?? 2000}
              onChange={(e) => {
                set('timeLimitMs', Number(e.target.value));
              }}
              className="input"
            />
          </div>
          <div>
            <label className="label">Memory Limit (MB)</label>
            <input
              type="number"
              min={16}
              max={512}
              value={form.memoryLimitMb ?? 128}
              onChange={(e) => {
                set('memoryLimitMb', Number(e.target.value));
              }}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Tags (comma-separated)</label>
          <input
            value={(form.tags ?? []).join(', ')}
            onChange={(e) => {
              set(
                'tags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              );
            }}
            className="input"
            placeholder="arrays, hash-map, easy"
          />
        </div>

        <div>
          <label className="label mb-2">Supported Languages</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  toggleLanguage(lang);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${(form.supportedLanguages ?? []).includes(lang) ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30' : 'border border-slate-700 text-slate-400 hover:text-white'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60 hover:bg-cyan-300 transition"
          >
            {saving ? 'Saving…' : 'Save Challenge'}
          </button>
        </div>
      </form>

      {/* Test Cases */}
      {isEdit && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Test Cases ({String(testCases.length)})
            </h2>
            <button
              type="button"
              onClick={() => {
                void handleAddTestCase();
              }}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              + Add
            </button>
          </div>
          {testCases.length === 0 ? (
            <p className="text-xs text-slate-500">No test cases yet.</p>
          ) : (
            <div className="space-y-2">
              {testCases.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-300 truncate">
                      In: {tc.input || '(empty)'}
                    </p>
                    <p className="text-xs font-mono text-slate-400 truncate">
                      Out: {tc.expectedOutput}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium ${tc.isHidden ? 'text-amber-400' : 'text-slate-500'}`}
                  >
                    {tc.isHidden ? 'Hidden' : 'Visible'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteTestCase(tc.id);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hints */}
      {isEdit && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Hints ({String(hints.length)})</h2>
            <button
              type="button"
              onClick={() => {
                void handleAddHint();
              }}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              + Add
            </button>
          </div>
          {hints.length === 0 ? (
            <p className="text-xs text-slate-500">No hints yet.</p>
          ) : (
            <div className="space-y-2">
              {hints.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2"
                >
                  <span className="text-xs font-bold text-cyan-400 mt-0.5">#{String(h.level)}</span>
                  <p className="flex-1 text-xs text-slate-300">{h.content}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteHint(h.id);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
