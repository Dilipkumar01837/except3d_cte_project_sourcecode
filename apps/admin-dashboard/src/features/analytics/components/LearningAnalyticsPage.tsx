import { useCallback, useEffect, useState } from 'react';
import { adminApi, type LearningAnalytics } from '@/shared/lib/admin-api';

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function LearningAnalyticsPage() {
  const [analytics, setAnalytics] = useState<LearningAnalytics>();
  const [from, setFrom] = useState(dateValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(dateValue(new Date()));
  const [error, setError] = useState('');
  const [experimentKey, setExperimentKey] = useState('');
  const [experimentName, setExperimentName] = useState('');
  const [experimentVariants, setExperimentVariants] = useState('control,treatment');
  const [hintEffectiveness, setHintEffectiveness] = useState<{
    total: number;
    rated: number;
    helpfulRate: number;
    solveRate: number;
  }>();
  const load = useCallback(
    () =>
      adminApi
        .getLearningAnalytics({ from, to })
        .then(setAnalytics)
        .catch(() => {
          setError('Learning analytics are unavailable.');
        }),
    [from, to],
  );
  useEffect(() => {
    void load();
    void adminApi
      .getHintAnalytics()
      .then(setHintEffectiveness)
      .catch(() => undefined);
  }, [load]);
  const exportCsv = async () => {
    const blob = await adminApi.exportLearningAnalytics({ from, to });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'learning-events.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const max = Math.max(
    1,
    ...(analytics?.worlds.map((item) => Math.abs(item.averageImprovement)) ?? []),
  );
  const createExperiment = async () => {
    try {
      await adminApi.createExperiment({
        key: experimentKey,
        name: experimentName,
        variants: experimentVariants
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        isActive: true,
      });
      setExperimentKey('');
      setExperimentName('');
      setExperimentVariants('control,treatment');
    } catch {
      setError('Unable to create experiment.');
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Learning Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Aggregate pre/post outcomes and opt-in research signals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void exportCsv();
          }}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950"
        >
          Export anonymized CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-700/50 bg-slate-900 p-4">
        <label className="text-xs text-slate-400">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
            }}
            className="mt-1 block rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
            }}
            className="mt-1 block rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
          />
        </label>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {hintEffectiveness && (
        <section className="rounded-xl border border-cyan-400/20 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">Hint Effectiveness</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Hints served</p>
              <p className="text-2xl font-bold text-cyan-300">{hintEffectiveness.total}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Helpful ratings</p>
              <p className="text-2xl font-bold text-emerald-300">
                {Math.round(hintEffectiveness.helpfulRate * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Solved after hint</p>
              <p className="text-2xl font-bold text-amber-300">
                {Math.round(hintEffectiveness.solveRate * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Rated hints</p>
              <p className="text-2xl font-bold text-white">{hintEffectiveness.rated}</p>
            </div>
          </div>
        </section>
      )}
      <section className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
        <h2 className="font-semibold text-white">Average score improvement</h2>
        <div className="mt-5 space-y-4">
          {analytics?.worlds.map((item) => (
            <div key={item.worldId}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-300">{item.worldName}</span>
                <span className="font-bold text-emerald-300">
                  {item.averageImprovement.toFixed(1)} pts · {item.pairedUsers} paired
                </span>
              </div>
              <div className="h-3 rounded bg-slate-800">
                <div
                  className="h-3 rounded bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{
                    width: `${String(Math.min(100, (Math.abs(item.averageImprovement) / max) * 100))}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Median {item.medianImprovement.toFixed(1)} pts · assessment time{' '}
                {Math.round(item.averageAssessmentTimeMs / 1000)}s
              </p>
            </div>
          ))}
        </div>
        {analytics?.worlds.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            No paired assessment attempts in this period.
          </p>
        )}
      </section>
      {analytics?.experimentVariants.length ? (
        <section className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">Experiment assignment coverage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {analytics.experimentVariants.map((item) => (
              <div key={item.variant} className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs uppercase text-slate-500">{item.variant}</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">{item.users}</p>
                <p className="text-xs text-slate-400">assigned users</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
        <h2 className="font-semibold text-white">Create experiment</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={experimentKey}
            onChange={(event) => {
              setExperimentKey(event.target.value);
            }}
            placeholder="key"
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <input
            value={experimentName}
            onChange={(event) => {
              setExperimentName(event.target.value);
            }}
            placeholder="name"
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <input
            value={experimentVariants}
            onChange={(event) => {
              setExperimentVariants(event.target.value);
            }}
            placeholder="control,treatment"
            className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          disabled={!experimentKey || !experimentName}
          onClick={() => {
            void createExperiment();
          }}
          className="mt-3 rounded-lg border border-cyan-400/40 px-4 py-2 text-sm font-bold text-cyan-300 disabled:opacity-50"
        >
          Create and activate
        </button>
      </section>
    </div>
  );
}
