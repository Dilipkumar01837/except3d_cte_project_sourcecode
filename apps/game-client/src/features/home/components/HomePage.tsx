import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { APP_NAME } from '@code-to-escape/shared';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: '01',
    title: 'Code your way out',
    description: 'Solve real programming challenges to unlock pathways, tools, and rooms.',
  },
  {
    icon: '02',
    title: 'Learn by doing',
    description: 'Build confidence with instant feedback and missions that adapt to your pace.',
  },
  {
    icon: '03',
    title: 'Make it memorable',
    description: 'Earn XP, protect your streak, and turn every completed challenge into progress.',
  },
];

const languages = ['Python', 'JavaScript', 'TypeScript', 'Rust', 'Go'];

/** Premium public landing page for the Code to Escape game. */
export function HomePage() {
  return (
    <div className="overflow-hidden bg-[#050816] text-slate-100">
      <section className="relative isolate border-b border-white/10">
        <div aria-hidden="true" className="landing-grid absolute inset-0 -z-10 opacity-50" />
        <div
          aria-hidden="true"
          className="absolute -left-24 top-12 -z-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-32 -z-10 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"
        />
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <p className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              The coding adventure awaits
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[.95] tracking-tight sm:text-6xl lg:text-7xl">
              Learn code.
              <br />
              <span className="text-cyan-300">Escape worlds.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              {APP_NAME} turns programming practice into an adventure. Write logic, outsmart
              enemies, and escape one challenge at a time.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-xl bg-cyan-400 px-6 py-3.5 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#050816]"
              >
                Start your escape
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 font-bold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                See how it works
              </a>
            </div>
            <dl className="mt-12 flex gap-8 border-t border-white/10 pt-7 sm:gap-12">
              <div>
                <dt className="text-2xl font-bold text-white">5</dt>
                <dd className="text-sm text-slate-400">worlds to master</dd>
              </div>
              <div>
                <dt className="text-2xl font-bold text-white">100+</dt>
                <dd className="text-sm text-slate-400">coding missions</dd>
              </div>
              <div>
                <dt className="text-2xl font-bold text-white">∞</dt>
                <dd className="text-sm text-slate-400">ways to learn</dd>
              </div>
            </dl>
          </motion.div>
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.65 }}
          >
            <div
              className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-cyan-500/30 to-violet-500/30 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative rounded-[1.7rem] border border-white/15 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">mission_01.py</span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  LIVE RUN
                </span>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-[#0b1022] p-5 font-mono text-sm leading-7 text-slate-300">
                <code>
                  <span className="text-violet-300">def</span>{' '}
                  <span className="text-cyan-300">open_gate</span>(key):{`\n`} {`if`} key =={' '}
                  <span className="text-emerald-300">"logic"</span>:{`\n`} gate.unlock(){`\n`}{' '}
                  player.escape(){`\n`}{' '}
                  <span className="text-slate-500"># Find the missing key</span>
                </code>
              </pre>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-lg bg-white/5 p-3 text-cyan-200">+250 XP</div>
                <div className="rounded-lg bg-white/5 p-3 text-violet-200">Level 04</div>
                <div className="rounded-lg bg-white/5 p-3 text-amber-200">3 day streak</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-300">
          Play. Learn. Level up.
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <h2 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
            A new way to make programming stick.
          </h2>
          <p className="max-w-sm text-slate-400">
            Every interaction is designed to connect a coding concept with a moment of discovery.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/[.035] p-7 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[.06]"
            >
              <p className="font-mono text-sm text-cyan-300">{feature.icon}</p>
              <h3 className="mt-10 text-xl font-bold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/40 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-[.2em] text-slate-500">
            Built around the languages you will use
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {languages.map((language) => (
              <span
                key={language}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200"
              >
                {language}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/15 via-slate-900 to-violet-500/20 px-7 py-14 text-center sm:px-14">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-200">
            Your first world is ready
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            The only way out is through the code.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-300">
            Start with Python Forest and discover how far a few lines of logic can take you.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Create your player profile
          </Link>
        </div>
      </section>
    </div>
  );
}
