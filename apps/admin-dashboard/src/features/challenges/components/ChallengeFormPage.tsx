import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, type AdminChallenge, type ChallengeTestCase } from '@/shared/lib/admin-api';

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

interface TestCaseDraft {
  id: string;
  input: string;
  expectedOutput: string;
  explanation: string;
  isHidden: boolean;
  weight: number;
  sortOrder: number;
  isNew: boolean;
}

interface HintDraft {
  id: string;
  level: number;
  content: string;
  xpPenalty: number;
  isNew: boolean;
}

function toTestCaseDraft(tc: ChallengeTestCase): TestCaseDraft {
  return {
    id: tc.id,
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    explanation: tc.explanation ?? '',
    isHidden: tc.isHidden,
    weight: tc.weight,
    sortOrder: tc.sortOrder,
    isNew: false,
  };
}

function emptyTestCaseDraft(sortOrder: number): TestCaseDraft {
  return {
    id: `new-tc-${String(Date.now())}`,
    input: '',
    expectedOutput: '',
    explanation: '',
    isHidden: false,
    weight: 1,
    sortOrder,
    isNew: true,
  };
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
  const [testCases, setTestCases] = useState<TestCaseDraft[]>([]);
  const [hints, setHints] = useState<HintDraft[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingTestCaseId, setSavingTestCaseId] = useState('');
  const [savingHintId, setSavingHintId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    adminApi
      .getChallenge(id)
      .then(({ challenge }) => {
        setForm(challenge);
        setTestCases((challenge.testCases ?? []).map(toTestCaseDraft));
        setHints((challenge.hints ?? []).map((hint) => ({ ...hint, isNew: false })));
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
  const addTestCaseDraft = () => {
    const nextSort = testCases.reduce((max, tc) => Math.max(max, tc.sortOrder), -1) + 1;
    setTestCases((prev) => [...prev, emptyTestCaseDraft(nextSort)]);
  };

  const patchTestCase = (draftId: string, patch: Partial<TestCaseDraft>) => {
    setTestCases((prev) => prev.map((tc) => (tc.id === draftId ? { ...tc, ...patch } : tc)));
  };

  const saveTestCase = async (draft: TestCaseDraft) => {
    if (!id) return;
    if (!draft.expectedOutput.trim()) {
      alert('Test case requires an expected output.');
      return;
    }
    setSavingTestCaseId(draft.id);
    try {
      if (draft.isNew) {
        const { testCase } = await adminApi.addTestCase(id, {
          input: draft.input,
          expectedOutput: draft.expectedOutput,
          explanation: draft.explanation,
          isHidden: draft.isHidden,
          weight: draft.weight,
          sortOrder: draft.sortOrder,
        });
        setTestCases((prev) =>
          prev.map((tc) => (tc.id === draft.id ? toTestCaseDraft(testCase) : tc)),
        );
      } else {
        const { testCase } = await adminApi.updateTestCase(id, draft.id, {
          input: draft.input,
          expectedOutput: draft.expectedOutput,
          explanation: draft.explanation,
          isHidden: draft.isHidden,
          weight: draft.weight,
          sortOrder: draft.sortOrder,
        });
        setTestCases((prev) =>
          prev.map((tc) => (tc.id === draft.id ? toTestCaseDraft(testCase) : tc)),
        );
      }
    } catch {
      alert('Failed to save test case.');
    } finally {
      setSavingTestCaseId('');
    }
  };

  const deleteTestCase = async (draft: TestCaseDraft) => {
    if (!id || !window.confirm('Delete this test case?')) return;
    if (draft.isNew) {
      setTestCases((prev) => prev.filter((tc) => tc.id !== draft.id));
      return;
    }
    try {
      await adminApi.deleteTestCase(id, draft.id);
      setTestCases((prev) => prev.filter((tc) => tc.id !== draft.id));
    } catch {
      alert('Failed to delete.');
    }
  };

  // Hint management
  const addHintDraft = () => {
    const nextLevel = hints.reduce((max, h) => Math.max(max, h.level), 0) + 1;
    setHints((prev) => [
      ...prev,
      {
        id: `new-hint-${String(Date.now())}`,
        level: nextLevel,
        content: '',
        xpPenalty: 0,
        isNew: true,
      },
    ]);
  };

  const patchHint = (hintId: string, patch: Partial<HintDraft>) => {
    setHints((prev) => prev.map((h) => (h.id === hintId ? { ...h, ...patch } : h)));
  };

  const saveHint = async (draft: HintDraft) => {
    if (!id) return;
    if (!draft.content.trim()) {
      alert('Hint content cannot be empty.');
      return;
    }
    setSavingHintId(draft.id);
    try {
      if (draft.isNew) {
        const { hint } = await adminApi.addHint(id, {
          level: draft.level,
          content: draft.content,
          xpPenalty: draft.xpPenalty,
        });
        setHints((prev) => prev.map((h) => (h.id === draft.id ? { ...hint, isNew: false } : h)));
      } else {
        const { hint } = await adminApi.updateHint(id, draft.id, {
          level: draft.level,
          content: draft.content,
          xpPenalty: draft.xpPenalty,
        });
        setHints((prev) => prev.map((h) => (h.id === draft.id ? { ...hint, isNew: false } : h)));
      }
    } catch {
      alert('Failed to save hint.');
    } finally {
      setSavingHintId('');
    }
  };

  const deleteHint = async (draft: HintDraft) => {
    if (!id || !window.confirm('Delete this hint?')) return;
    if (draft.isNew) {
      setHints((prev) => prev.filter((h) => h.id !== draft.id));
      return;
    }
    try {
      await adminApi.deleteHint(id, draft.id);
      setHints((prev) => prev.filter((h) => h.id !== draft.id));
    } catch {
      alert('Failed to delete.');
    }
  };

  const sectionClass = 'rounded-xl border border-slate-700/50 bg-slate-900 p-5 space-y-3';
  const busy = savingTestCaseId !== '' || savingHintId !== '';

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
        <div className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Test Cases ({String(testCases.length)})
            </h2>
            <button
              type="button"
              onClick={addTestCaseDraft}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              + Add test case
            </button>
          </div>
          {testCases.length === 0 ? (
            <p className="text-xs text-slate-500">No test cases yet.</p>
          ) : (
            <div className="space-y-3">
              {testCases.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-800 p-3 space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="label text-[11px]">Input</span>
                      <textarea
                        rows={2}
                        value={draft.input}
                        onChange={(e) => {
                          patchTestCase(draft.id, { input: e.target.value });
                        }}
                        className="input font-mono text-xs resize-y"
                        placeholder="stdin"
                      />
                    </label>
                    <label className="block">
                      <span className="label text-[11px]">Expected output</span>
                      <textarea
                        rows={2}
                        value={draft.expectedOutput}
                        onChange={(e) => {
                          patchTestCase(draft.id, { expectedOutput: e.target.value });
                        }}
                        className="input font-mono text-xs resize-y"
                        placeholder="stdout"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="label text-[11px]">Explanation (shown to players)</span>
                    <input
                      value={draft.explanation}
                      onChange={(e) => {
                        patchTestCase(draft.id, { explanation: e.target.value });
                      }}
                      className="input text-xs"
                      placeholder="Optional explanation for the example"
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.isHidden}
                        onChange={(e) => {
                          patchTestCase(draft.id, { isHidden: e.target.checked });
                        }}
                        className="accent-amber-400"
                      />
                      Hidden test
                    </label>
                    <label className="block">
                      <span className="label text-[11px]">Sort order</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.sortOrder}
                        onChange={(e) => {
                          patchTestCase(draft.id, { sortOrder: Number(e.target.value) });
                        }}
                        className="input w-24 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="label text-[11px]">Weight</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.weight}
                        onChange={(e) => {
                          patchTestCase(draft.id, { weight: Number(e.target.value) });
                        }}
                        className="input w-24 text-xs"
                      />
                    </label>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void saveTestCase(draft);
                        }}
                        className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                      >
                        {savingTestCaseId === draft.id ? 'Saving…' : draft.isNew ? 'Add' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteTestCase(draft);
                        }}
                        className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hints */}
      {isEdit && (
        <div className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Hints ({String(hints.length)})</h2>
            <button
              type="button"
              onClick={addHintDraft}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              + Add hint
            </button>
          </div>
          {hints.length === 0 ? (
            <p className="text-xs text-slate-500">No hints yet.</p>
          ) : (
            <div className="space-y-3">
              {hints.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-800 p-3 space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-[96px_1fr_120px]">
                    <label className="block">
                      <span className="label text-[11px]">Level</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.level}
                        onChange={(e) => {
                          patchHint(draft.id, { level: Number(e.target.value) });
                        }}
                        className="input text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="label text-[11px]">Content</span>
                      <textarea
                        rows={2}
                        value={draft.content}
                        onChange={(e) => {
                          patchHint(draft.id, { content: e.target.value });
                        }}
                        className="input text-xs resize-y"
                        placeholder="The trick is to sort by value, not by index."
                      />
                    </label>
                    <label className="block">
                      <span className="label text-[11px]">XP penalty</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.xpPenalty}
                        onChange={(e) => {
                          patchHint(draft.id, { xpPenalty: Number(e.target.value) });
                        }}
                        className="input text-xs"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void saveHint(draft);
                      }}
                      className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                    >
                      {savingHintId === draft.id ? 'Saving…' : draft.isNew ? 'Add' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteHint(draft);
                      }}
                      className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
