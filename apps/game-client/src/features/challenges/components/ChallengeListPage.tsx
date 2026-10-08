import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { challengeApi, type ChallengeSummary } from '../lib/challenge-api';

const difficulties = ['ALL', 'EASY', 'MEDIUM', 'HARD'] as const;
const difficultyStyle: Record<string, string> = {
  EASY: 'bg-emerald-400/15 text-emerald-200',
  MEDIUM: 'bg-amber-400/15 text-amber-200',
  HARD: 'bg-rose-400/15 text-rose-200',
};

function ChallengeCard({ challenge, index }: { challenge: ChallengeSummary; index: number }) {
  const { isAuthenticated } = useAuthStore();
  const language = challenge.supportedLanguages[0]?.replace('_', ' ') ?? 'Multiple languages';
  const minutes = Math.max(5, Math.ceil(challenge.timeLimitMs / 60000) * 5);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[.06] hover:shadow-xl hover:shadow-cyan-950/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">
            {language}
          </p>
          <h2 className="mt-2 text-lg font-bold text-white">{challenge.title}</h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${difficultyStyle[challenge.difficulty] ?? 'bg-white/10 text-slate-200'}`}
        >
          {challenge.difficulty}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {challenge.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 border-y border-white/10 py-4 text-center text-xs">
        <div>
          <p className="font-bold text-amber-200">+{challenge.xpReward}</p>
          <p className="mt-1 text-slate-500">XP</p>
        </div>
        <div>
          <p className="font-bold text-slate-200">~{minutes}m</p>
          <p className="mt-1 text-slate-500">estimate</p>
        </div>
        <div>
          <p className="font-bold text-cyan-200">0%</p>
          <p className="mt-1 text-slate-500">complete</p>
        </div>
      </div>
      <Link
        to={isAuthenticated ? `/challenges/${challenge.slug}` : '/login'}
        className="mt-5 flex items-center justify-between text-sm font-bold text-cyan-200"
      >
        {isAuthenticated ? 'Start challenge' : 'Sign in to start'}{' '}
        <span className="transition group-hover:translate-x-1">→</span>
      </Link>
    </motion.article>
  );
}

export function ChallengeListPage() {
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>('ALL');
  const [language, setLanguage] = useState('ALL');
  const [error, setError] = useState('');
  useEffect(() => {
    void challengeApi
      .list()
      .then(setChallenges)
      .catch(() => {
        setError('Challenges are unavailable right now.');
      });
  }, []);
  const languages = useMemo(
    () => [
      'ALL',
      ...Array.from(new Set(challenges.flatMap((challenge) => challenge.supportedLanguages))),
    ],
    [challenges],
  );
  const filtered = useMemo(
    () =>
      challenges.filter(
        (challenge) =>
          (difficulty === 'ALL' || challenge.difficulty === difficulty) &&
          (language === 'ALL' ||
            challenge.supportedLanguages.includes(
              language as ChallengeSummary['supportedLanguages'][number],
            )) &&
          `${challenge.title} ${(challenge.tags ?? []).join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [challenges, difficulty, language, query],
  );
  const featured = filtered.slice(0, 3);

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <section className="relative border-b border-white/10">
        <div aria-hidden="true" className="landing-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">
            Explore missions
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
            Find your next way out.
          </h1>
          <p className="mt-5 max-w-xl text-slate-300">
            Explore hand-crafted programming missions, earn XP, and build momentum one challenge at
            a time.
          </p>
          <label className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-xl backdrop-blur">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              placeholder="Search challenges, concepts, or languages"
            />
          </label>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {difficulties.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setDifficulty(item);
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${difficulty === item ? 'bg-cyan-300 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              {item === 'ALL' ? 'All difficulties' : item}
            </button>
          ))}
          <span className="mx-1 hidden h-8 w-px bg-white/10 sm:block" />
          {languages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setLanguage(item);
              }}
              className={`rounded-full px-3 py-2 text-xs transition ${language === item ? 'bg-violet-400/25 text-violet-100' : 'text-slate-400 hover:text-white'}`}
            >
              {item === 'ALL' ? 'All languages' : item}
            </button>
          ))}
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-100"
          >
            {error}
          </p>
        ) : (
          <>
            <div className="mt-12 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">
                  Featured challenges
                </p>
                <h2 className="mt-2 text-2xl font-bold">Start a new escape route</h2>
              </div>
              <p className="text-sm text-slate-500">{filtered.length} missions found</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((challenge, index) => (
                <ChallengeCard key={challenge.id} challenge={challenge} index={index} />
              ))}
            </div>
            <div className="mt-14">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">
                Popular and recently added
              </p>
              <h2 className="mt-2 text-2xl font-bold">Keep exploring</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.slice(3).map((challenge, index) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} index={index} />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
                  No challenges match these filters. Try a different search.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
