import { Link } from 'react-router-dom';
import type { Vec2 } from '../lib/room-geometry';
import type { RoomConfig } from '../lib/room-config';
import type { RoomState } from '../lib/room-state';

type Direction = 'up' | 'down' | 'left' | 'right';

interface RoomHUDProps {
  config: RoomConfig;
  state: RoomState;
  worldName: string;
  worldId: string;
  levelNumber: number;
  xpReward: number;
  player: Vec2;
  onDirection: (direction: Direction, pressed: boolean) => void;
}

const DPAD: { direction: Direction; label: string; className: string; glyph: string }[] = [
  { direction: 'up', label: 'Move up', className: 'col-start-2 row-start-1', glyph: '▲' },
  { direction: 'left', label: 'Move left', className: 'col-start-1 row-start-2', glyph: '◀' },
  { direction: 'right', label: 'Move right', className: 'col-start-3 row-start-2', glyph: '▶' },
  { direction: 'down', label: 'Move down', className: 'col-start-2 row-start-3', glyph: '▼' },
];

export function RoomHUD({
  config,
  state,
  worldName,
  worldId,
  levelNumber,
  xpReward,
  player,
  onDirection,
}: RoomHUDProps) {
  return (
    <header className="border-b border-white/10 bg-black/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <Link
            to={`/worlds/${worldId}`}
            className="text-sm font-bold text-cyan-200 hover:text-white"
          >
            ← {worldName}
          </Link>
          <p className="text-[11px] font-bold tracking-[.18em] text-cyan-300 uppercase">
            Room {levelNumber} · {config.title}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-200">
            +{xpReward} XP
          </span>
          <span
            className={
              state.isCompleted
                ? 'rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-emerald-200'
                : 'rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-300'
            }
          >
            {state.isCompleted ? 'Room complete' : 'In progress'}
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <h2 className="text-xs font-bold tracking-[.2em] text-slate-500 uppercase">Objectives</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {state.objectives.map((objective) => (
              <li key={objective.id} className="flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${
                    objective.done ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-400'
                  }`}
                  aria-hidden="true"
                >
                  {objective.done ? '✓' : '·'}
                </span>
                <span className={objective.done ? 'text-emerald-200' : 'text-slate-300'}>
                  {objective.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            Use <span className="font-bold text-slate-200">WASD</span> or the arrow keys to explore.
            Walk up to an object and press <span className="font-bold text-slate-200">E</span> to
            interact.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <h2 className="mb-2 text-xs font-bold tracking-[.2em] text-slate-500 uppercase">Map</h2>
            <svg
              viewBox={`0 0 ${String(config.bounds.width)} ${String(config.bounds.height)}`}
              className="h-auto w-full rounded-xl border border-white/10 bg-black/40"
              aria-label="Room minimap"
              role="img"
            >
              {config.obstacles.map((obstacle, index) => (
                <rect
                  key={index}
                  x={obstacle.x}
                  y={obstacle.y}
                  width={obstacle.width}
                  height={obstacle.height}
                  rx="10"
                  fill="rgba(255,255,255,0.09)"
                />
              ))}
              {config.objects.map((object) => (
                <rect
                  key={object.id}
                  x={object.x - object.width / 2}
                  y={object.y - object.height / 2}
                  width={object.width}
                  height={object.height}
                  rx="8"
                  fill={
                    object.kind === 'door'
                      ? state.isCompleted
                        ? '#34d399'
                        : '#b45309'
                      : config.theme.accent
                  }
                  opacity="0.9"
                />
              ))}
              <circle
                cx={player.x}
                cy={player.y}
                r="16"
                fill={config.theme.player}
                stroke="#fff"
                strokeWidth="4"
              />
            </svg>
          </div>

          <div className="grid grid-cols-3 grid-rows-3 gap-1 self-end">
            {DPAD.map((button) => (
              <button
                key={button.direction}
                type="button"
                aria-label={button.label}
                className={`${button.className} grid h-11 w-11 touch-none place-items-center rounded-lg border border-white/15 bg-white/5 text-sm text-slate-200 active:bg-cyan-300/20`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  onDirection(button.direction, true);
                }}
                onPointerUp={() => {
                  onDirection(button.direction, false);
                }}
                onPointerLeave={() => {
                  onDirection(button.direction, false);
                }}
                onPointerCancel={() => {
                  onDirection(button.direction, false);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                }}
              >
                {button.glyph}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
