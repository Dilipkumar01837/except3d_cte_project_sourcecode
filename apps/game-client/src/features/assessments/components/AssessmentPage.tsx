import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { assessmentApi, type Assessment } from '../lib/assessment-api';

export function AssessmentPage() {
  const [params] = useSearchParams();
  const [assessment, setAssessment] = useState<Assessment>();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [startedAt] = useState(Date.now());
  const [result, setResult] = useState<{ score: number; maxScore: number }>();
  const [error, setError] = useState('');
  const type = params.get('type') === 'POST' ? 'POST' : 'PRE';

  useEffect(() => {
    void assessmentApi
      .list(params.get('worldId') ?? undefined, type)
      .then((items) => {
        setAssessment(items[0]);
      })
      .catch(() => {
        setError('Assessment unavailable.');
      });
  }, [params, type]);

  const submit = async () => {
    if (!assessment) return;
    try {
      const attempt = await assessmentApi.submit(assessment.id, answers, Date.now() - startedAt);
      setResult(attempt);
    } catch {
      setError('Unable to submit assessment.');
    }
  };
  const answerText = (id: string): string => {
    const value = answers[id];
    return typeof value === 'string' ? value : '';
  };

  if (error)
    return (
      <PlayerPageShell eyebrow="Assessment" title="Unavailable" subtitle={error}>
        <Link to="/worlds" className="text-cyan-200">
          Return to worlds
        </Link>
      </PlayerPageShell>
    );
  if (!assessment)
    return (
      <PlayerPageShell
        eyebrow="Assessment"
        title="Preparing assessment..."
        subtitle="Loading aligned learning questions."
      >
        <div />
      </PlayerPageShell>
    );
  return (
    <PlayerPageShell
      eyebrow={`${assessment.type === 'PRE' ? 'Before' : 'After'} the world`}
      title={assessment.title}
      subtitle={
        assessment.description ??
        'Answer independently. Your score is saved for learning-outcome measurement.'
      }
      maxWidth="4xl"
    >
      {result ? (
        <section className="rounded-2xl border border-emerald-300/30 bg-emerald-300/[.08] p-8 text-center">
          <p className="text-sm text-emerald-200">Assessment saved</p>
          <p className="mt-2 text-4xl font-black text-white">
            {result.score} / {result.maxScore}
          </p>
          <Link
            to={assessment.worldId ? `/worlds/${assessment.worldId}` : '/worlds'}
            className="mt-5 inline-block font-bold text-cyan-200"
          >
            Continue →
          </Link>
        </section>
      ) : (
        <section className="space-y-5">
          {assessment.questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
            >
              <p className="text-xs uppercase text-slate-500">Question {index + 1}</p>
              <h2 className="mt-2 font-semibold text-white">{question.prompt}</h2>
              {Array.isArray(question.options) ? (
                <div className="mt-4 space-y-2">
                  {question.options.map((option) => (
                    <label key={option} className="flex gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: option }));
                        }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  aria-label={`Answer ${String(index + 1)}`}
                  value={answerText(question.id)}
                  onChange={(event) => {
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value }));
                  }}
                  className="mt-4 min-h-24 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              void submit();
            }}
            className="rounded-lg bg-cyan-300 px-5 py-3 font-bold text-slate-950"
          >
            Submit assessment
          </button>
        </section>
      )}
    </PlayerPageShell>
  );
}
