import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { RoomConfig } from '../lib/room-config';

interface RoomCompletionOverlayProps {
  open: boolean;
  config: RoomConfig;
  worldName: string;
  worldId: string;
  nextRoomPath: string | null;
  keyTitle: string | null;
  onClose: () => void;
}

/** Shown after the backend confirms the room's challenge was accepted. */
export function RoomCompletionOverlay({
  open,
  config,
  worldName,
  worldId,
  nextRoomPath,
  keyTitle,
  onClose,
}: RoomCompletionOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Room complete"
            className="w-full max-w-md rounded-2xl border border-emerald-300/40 bg-[#062018] p-8 text-center text-slate-100 shadow-2xl"
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 16 }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <p className="text-5xl" aria-hidden="true">
              🗝️
            </p>
            <h2 className="mt-3 text-2xl font-black text-emerald-200">Room Complete</h2>
            <p className="mt-2 text-sm text-slate-300">
              {config.title} in {worldName} is cleared.
            </p>
            {keyTitle ? (
              <p className="mt-3 text-sm font-bold text-amber-200">Key found: {keyTitle}</p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2">
              {nextRoomPath ? (
                <Link
                  to={nextRoomPath}
                  className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-slate-950 hover:bg-emerald-300"
                >
                  Enter the next room →
                </Link>
              ) : null}
              <Link
                to={`/worlds/${worldId}`}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold"
              >
                Return to the map
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-slate-400 hover:text-white"
              >
                Stay in this room
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
