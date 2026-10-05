import { useState } from 'react';
import { PlayerPageShell } from '@/shared/components/layout/PlayerPageShell';
import { ActionLink, GlassPanel, PanelHeading, StatTile } from '@/shared/components/ui/player-ui';

const colors = [
  ['Base', 'bg-ink-base'],
  ['Surface', 'bg-ink-surface'],
  ['Elevated', 'bg-ink-elevated'],
  ['Amber', 'bg-amber-400'],
  ['Success', 'bg-emerald-500'],
  ['Danger', 'bg-red-500'],
] as const;

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState('Overview');
  return (
    <PlayerPageShell
      eyebrow="Internal"
      title="Design system"
      subtitle="A compact reference for the Code to Escape interface language."
      maxWidth="7xl"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <PanelHeading
            title="Buttons"
            description="One primary action, quiet secondary actions, visible focus."
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300"
            >
              Primary action
            </button>
            <button
              type="button"
              className="rounded-md border border-ink-strong bg-ink-elevated px-4 py-2 text-sm font-medium text-zinc-200 hover:border-amber-400/60"
            >
              Secondary
            </button>
            <button
              type="button"
              className="rounded-md border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
            >
              Danger
            </button>
            <ActionLink to="/dashboard" variant="secondary">
              Link action
            </ActionLink>
          </div>
        </GlassPanel>
        <GlassPanel>
          <PanelHeading title="Inputs and badges" />
          <div className="space-y-3">
            <input
              aria-label="Example input"
              placeholder="Search challenges"
              className="w-full rounded-md border border-ink-border bg-ink-elevated px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-mono text-xs text-amber-300">
                IN PROGRESS
              </span>
              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-xs text-emerald-300">
                PASSED
              </span>
              <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-xs text-red-300">
                LOCKED
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-amber-400">Metrics</p>
            <h2 className="mt-1 text-xl font-semibold">Dense data surfaces</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md border border-ink-border px-3 py-2 text-sm text-zinc-300 hover:border-amber-400/60"
          >
            Open dialog
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="XP" value="2,480" accent="amber" />
          <StatTile label="Streak" value="12d" accent="emerald" />
          <StatTile label="Win rate" value="68%" accent="cyan" />
        </div>
      </section>
      <GlassPanel>
        <div className="flex gap-5 border-b border-ink-border">
          {['Overview', 'Achievements', 'Activity'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`border-b-2 px-1 pb-3 text-sm ${tab === item ? 'border-amber-400 text-amber-300' : 'border-transparent text-zinc-500 hover:text-zinc-200'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="pt-5 text-sm text-zinc-400">
          {tab} view placeholder for the component showcase.
        </p>
        <div className="mt-4 h-1 overflow-hidden rounded-sm bg-ink-elevated">
          <div className="h-full w-2/3 bg-amber-400" />
        </div>
      </GlassPanel>
      <GlassPanel>
        <PanelHeading title="Token palette" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {colors.map(([label, color]) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`h-8 w-8 rounded-md border border-ink-strong ${color}`} />
              <span className="font-mono text-xs text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      </GlassPanel>
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-ink-strong bg-ink-elevated p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Dialog surface</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Flat border, restrained radius, and a clear close action.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="mt-5 rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </PlayerPageShell>
  );
}
