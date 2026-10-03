import { percent } from '../lib/room-geometry';
import type { RoomConfig, RoomObjectConfig } from '../lib/room-config';

interface RoomObjectProps {
  object: RoomObjectConfig;
  config: RoomConfig;
  active: boolean;
  locked: boolean;
  onActivate: () => void;
}

function ClueIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3/5 w-3/5" aria-hidden="true">
      <path
        d="M6 3h9l3 3v15H6z"
        fill="rgba(226,232,240,.15)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M9 9h6M9 12h6M9 15h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3/5 w-3/5" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="1.5"
        fill="rgba(226,232,240,.12)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7 9l2.5 2L7 13M12 13h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** An interactive room prop (clue stone or puzzle terminal). */
export function RoomObject({ object, config, active, locked, onActivate }: RoomObjectProps) {
  const Icon = object.kind === 'terminal' ? TerminalIcon : ClueIcon;
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={`${object.label}. ${object.prompt}`}
      className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border transition-transform duration-150 ${
        active ? 'scale-110' : ''
      }`}
      style={{
        left: percent(object.x, config.bounds.width),
        top: percent(object.y, config.bounds.height),
        width: percent(object.width, config.bounds.width),
        height: percent(object.height, config.bounds.height),
        color: config.theme.accent,
        background: 'rgba(2, 6, 23, 0.66)',
        borderColor: active ? config.theme.accent : 'rgba(255,255,255,0.22)',
        boxShadow: active ? `0 0 22px ${config.theme.accent}` : '0 6px 18px rgba(0,0,0,.4)',
      }}
    >
      <Icon />
      {locked && object.kind === 'terminal' ? (
        <span className="absolute -top-2 -right-2 text-base" aria-hidden="true">
          🔒
        </span>
      ) : null}
      <span className="pointer-events-none absolute -bottom-5 whitespace-nowrap text-[10px] font-bold tracking-wider text-slate-200 uppercase">
        {object.label}
      </span>
    </button>
  );
}
