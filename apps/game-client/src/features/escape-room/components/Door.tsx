import { motion } from 'framer-motion';
import { percent } from '../lib/room-geometry';
import type { RoomConfig, RoomObjectConfig } from '../lib/room-config';

interface DoorProps {
  object: RoomObjectConfig;
  config: RoomConfig;
  unlocked: boolean;
  active: boolean;
  onActivate: () => void;
}

/**
 * The room exit. It only unlocks from server-confirmed completion: the room page
 * passes `unlocked` straight from `level.isCompleted`, never from local state.
 */
export function Door({ object, config, unlocked, active, onActivate }: DoorProps) {
  return (
    <motion.button
      type="button"
      onClick={onActivate}
      aria-label={`${object.label}. ${unlocked ? 'Unlocked' : 'Locked'}. ${object.prompt}`}
      className="absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-t-2xl border-2"
      style={{
        left: percent(object.x, config.bounds.width),
        top: percent(object.y, config.bounds.height),
        width: percent(object.width, config.bounds.width),
        height: percent(object.height, config.bounds.height),
      }}
      animate={
        unlocked
          ? {
              backgroundColor: 'rgba(16, 185, 129, 0.22)',
              borderColor: 'rgba(52, 211, 153, 0.95)',
              boxShadow: '0 0 28px rgba(52, 211, 153, 0.7)',
            }
          : {
              backgroundColor: 'rgba(120, 53, 15, 0.55)',
              borderColor: active ? 'rgba(251, 191, 36, 0.95)' : 'rgba(180, 83, 9, 0.75)',
              boxShadow: active ? '0 0 20px rgba(251, 191, 36, 0.6)' : '0 0 0 rgba(0,0,0,0)',
            }
      }
      transition={{ duration: 1.1, ease: 'easeOut' }}
    >
      <span className="text-2xl" aria-hidden="true">
        {unlocked ? '🔓' : '🔒'}
      </span>
      <span className="pointer-events-none absolute -bottom-9 whitespace-nowrap text-[10px] font-bold tracking-wider text-slate-200 uppercase">
        {object.label}
      </span>
      <span
        className={`pointer-events-none text-[10px] font-black tracking-wider uppercase ${
          unlocked ? 'text-emerald-200' : 'text-amber-200'
        }`}
      >
        {unlocked ? 'Open' : 'Locked'}
      </span>
    </motion.button>
  );
}
