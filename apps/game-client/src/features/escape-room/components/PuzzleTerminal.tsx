import { AnimatePresence, motion } from 'framer-motion';

interface PuzzleTerminalProps {
  open: boolean;
  roomTitle: string;
  challengeTitle: string | null;
  locked: boolean;
  lockMessage: string;
  isCompleted: boolean;
  onStart: () => void;
  onClose: () => void;
}

/**
 * The terminal modal. "Start Challenge" hands off to the existing challenge
 * player — the room never re-implements the editor or judging.
 */
export function PuzzleTerminal({
  open,
  roomTitle,
  challengeTitle,
  locked,
  lockMessage,
  isCompleted,
  onStart,
  onClose,
}: PuzzleTerminalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Puzzle terminal"
            className="w-full max-w-md rounded-2xl border border-cyan-300/30 bg-[#070d24] p-6 text-slate-100 shadow-2xl"
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 12 }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <p className="text-xs font-bold tracking-[.2em] text-cyan-300 uppercase">Terminal</p>
            <h2 className="mt-2 text-xl font-black">{roomTitle}</h2>

            {locked ? (
              <>
                <p className="mt-4 text-sm text-amber-200">{lockMessage}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold"
                >
                  Step back
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-300">
                  {isCompleted
                    ? 'This terminal is already solved. You can replay the challenge for practice.'
                    : 'The terminal wakes and asks you to solve a coding puzzle to power the gate.'}
                </p>
                <p className="mt-3 text-sm font-bold text-cyan-200">
                  {challengeTitle ?? 'No challenge attached to this room'}
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={onStart}
                    disabled={!challengeTitle}
                    className="flex-1 rounded-xl bg-cyan-400 px-4 py-2 font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCompleted ? 'Replay challenge' : 'Start Challenge'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold"
                  >
                    Not yet
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
