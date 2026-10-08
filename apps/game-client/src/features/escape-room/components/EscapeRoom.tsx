import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorldDetail, WorldLevel } from '@/features/worlds/lib/world-api';
import { worldApi } from '@/features/worlds/lib/world-api';
import {
  INTERACTION_RADIUS,
  resolveRoomConfig,
  ROOM_PLAYER_HALF,
  type RoomObjectConfig,
} from '../lib/room-config';
import { distance, moveWithCollision, type Vec2 } from '../lib/room-geometry';
import { deriveRoomState } from '../lib/room-state';
import { InteractionPrompt } from './InteractionPrompt';
import { PuzzleTerminal } from './PuzzleTerminal';
import { RoomCanvas } from './RoomCanvas';
import { RoomCompletionOverlay } from './RoomCompletionOverlay';
import { RoomHUD } from './RoomHUD';
import { EscapeRoom3D } from './EscapeRoom3D';

const MOVE_SPEED = 5.5;
type Direction = 'up' | 'down' | 'left' | 'right';
type Modal = 'none' | 'clue' | 'terminal' | 'door' | 'complete';

function keyToDirection(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

interface EscapeRoomProps {
  world: WorldDetail;
  level: WorldLevel;
  justCleared: boolean;
  onRefresh: () => void;
}

/**
 * Orchestrates a single room: movement, interaction, and the hand-off to the
 * existing challenge player. All progression state comes from `level`, so the
 * door can only open when the backend has already recorded the completion.
 */
export function EscapeRoom({ world, level, justCleared, onRefresh }: EscapeRoomProps) {
  const navigate = useNavigate();
  const config = useMemo(
    () => resolveRoomConfig(world.slug, level.number, level.title),
    [world.slug, level.number, level.title],
  );

  const [state, setState] = useState(() => deriveRoomState(level));
  useEffect(() => {
    setState(deriveRoomState(level));
  }, [level]);

  const [player, setPlayer] = useState<Vec2>(config.spawn);
  const playerRef = useRef<Vec2>(config.spawn);
  useEffect(() => {
    playerRef.current = config.spawn;
    setPlayer(config.spawn);
  }, [config]);

  const [modal, setModal] = useState<Modal>('none');
  const [threeEnabled, setThreeEnabled] = useState(
    () => localStorage.getItem('cte:3d-room') !== 'off',
  );
  const modalOpen = modal !== 'none';
  const modalRef = useRef(modalOpen);
  useEffect(() => {
    modalRef.current = modalOpen;
  }, [modalOpen]);

  const pressed = useRef<Set<Direction>>(new Set());
  const rafRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const step = useCallback(() => {
    const keys = pressed.current;
    let dx = 0;
    let dy = 0;
    if (keys.has('left')) dx -= MOVE_SPEED;
    if (keys.has('right')) dx += MOVE_SPEED;
    if (keys.has('up')) dy -= MOVE_SPEED;
    if (keys.has('down')) dy += MOVE_SPEED;

    if (dx === 0 && dy === 0) {
      rafRef.current = null;
      return;
    }

    const next = moveWithCollision(
      playerRef.current,
      { x: dx, y: dy },
      ROOM_PLAYER_HALF,
      config.bounds,
      config.obstacles,
    );
    if (next.x !== playerRef.current.x || next.y !== playerRef.current.y) {
      playerRef.current = next;
      setPlayer(next);
    }
    rafRef.current = requestAnimationFrame(step);
  }, [config]);

  const setDirection = useCallback(
    (direction: Direction, isPressed: boolean) => {
      if (isPressed) {
        pressed.current.add(direction);
        if (rafRef.current === null) rafRef.current = requestAnimationFrame(step);
      } else {
        pressed.current.delete(direction);
      }
    },
    [step],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (modalRef.current) return;
      const direction = keyToDirection(event.key);
      if (!direction) return;
      event.preventDefault();
      setDirection(direction, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const direction = keyToDirection(event.key);
      if (direction) pressed.current.delete(direction);
    };
    const onBlur = () => {
      pressed.current.clear();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      stopLoop();
    };
  }, [setDirection, stopLoop]);

  useEffect(() => {
    if (modalOpen) {
      pressed.current.clear();
      stopLoop();
    }
  }, [modalOpen, stopLoop]);

  const activeObject = useMemo<RoomObjectConfig | null>(() => {
    let best: RoomObjectConfig | null = null;
    let bestDistance = INTERACTION_RADIUS;
    for (const object of config.objects) {
      const current = distance(player, { x: object.x, y: object.y });
      if (current <= bestDistance) {
        best = object;
        bestDistance = current;
      }
    }
    return best;
  }, [player, config]);

  const activate = useCallback(
    (object: RoomObjectConfig) => {
      if (object.kind === 'clue') {
        setModal('clue');
        setState((current) => {
          if (current.clueRead) return current;
          return {
            ...current,
            clueRead: true,
            objectives: current.objectives.map((objective) =>
              objective.id === 'clue' ? { ...objective, done: true } : objective,
            ),
          };
        });
        // Cosmetic persistence: failure here must not break the room.
        void worldApi.recordDiscovery(level.id).catch(() => undefined);
        return;
      }
      if (object.kind === 'terminal') {
        setModal('terminal');
        return;
      }
      setModal(state.isCompleted ? 'complete' : 'door');
    },
    [level.id, state.isCompleted],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || modalRef.current || !activeObject) return;
      event.preventDefault();
      activate(activeObject);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeObject, activate]);

  const completionShown = useRef(false);
  useEffect(() => {
    if (state.isCompleted && justCleared && !completionShown.current) {
      completionShown.current = true;
      setModal('complete');
    }
  }, [state.isCompleted, justCleared]);

  const lockMessage = useMemo(() => {
    if (level.access === 'LOCKED') {
      const title = level.guardedByRoomLock?.requiresKey?.title;
      return title
        ? `The gate is sealed. You need the ${title}.`
        : 'The gate is sealed by a key you have not found yet.';
    }
    return 'This gate only opens once the room before it is cleared.';
  }, [level.access, level.guardedByRoomLock]);

  const nextRoomPath = useMemo(() => {
    const next = world.levels
      .filter(
        (entry) =>
          entry.number > level.number &&
          (entry.access === 'OPEN' || entry.isCompleted) &&
          entry.challenge,
      )
      .sort((a, b) => a.number - b.number)[0];
    return next ? `/worlds/${world.id}/rooms/${String(next.number)}` : null;
  }, [world.levels, world.id, level.number]);

  const startChallenge = useCallback(() => {
    if (!level.challenge) return;
    void navigate(`/challenges/${encodeURIComponent(level.challenge.slug)}`);
  }, [level.challenge, navigate]);

  const prompt = useMemo(() => {
    if (!activeObject) return null;
    if (activeObject.kind === 'door') {
      return state.isCompleted ? 'Press E to escape' : 'Press E to try the gate';
    }
    return activeObject.prompt;
  }, [activeObject, state.isCompleted]);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <RoomHUD
        config={config}
        state={state}
        worldName={world.name}
        worldId={world.id}
        levelNumber={level.number}
        xpReward={level.xpReward}
        player={player}
        onDirection={setDirection}
      />

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const next = !threeEnabled;
              setThreeEnabled(next);
              localStorage.setItem('cte:3d-room', next ? 'on' : 'off');
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-300"
          >
            {threeEnabled ? 'Use 2D room' : 'Try 3D room'}
          </button>
        </div>
        {threeEnabled ? (
          <EscapeRoom3D
            level={level}
            completed={state.isCompleted}
            onChallenge={startChallenge}
            onClue={() => {
              setModal('clue');
              setState((current) => {
                if (current.clueRead) return current;
                return {
                  ...current,
                  clueRead: true,
                  objectives: current.objectives.map((objective) =>
                    objective.id === 'clue' ? { ...objective, done: true } : objective,
                  ),
                };
              });
              void worldApi.recordDiscovery(level.id).catch(() => undefined);
            }}
            onDoor={() => {
              setModal(state.isCompleted ? 'complete' : 'door');
            }}
            onFallback={() => {
              setThreeEnabled(false);
              localStorage.setItem('cte:3d-room', 'off');
            }}
          />
        ) : (
          <RoomCanvas
            config={config}
            state={state}
            player={player}
            activeObjectId={activeObject?.id ?? null}
            onActivate={activate}
          />
        )}
        <p className="mt-3 text-center text-xs text-slate-500">
          {state.isPlayable
            ? 'Move with WASD or the arrow keys. Approach a glowing object and press E to interact.'
            : 'This room is still sealed. Clear the room before it to open the way.'}
        </p>
      </main>

      <InteractionPrompt prompt={modalOpen ? null : prompt} />

      {modal === 'clue' ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setModal('none');
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Clue"
            className="w-full max-w-lg rounded-2xl border border-amber-300/30 bg-[#0b1020] p-6"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <p className="text-xs font-bold tracking-[.2em] text-amber-300 uppercase">Clue</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{config.clueText}</p>
            <button
              type="button"
              onClick={() => {
                setModal('none');
              }}
              className="mt-6 w-full rounded-xl bg-amber-300 px-4 py-2 font-black text-slate-950"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {modal === 'terminal' ? (
        <PuzzleTerminal
          open
          roomTitle={config.title}
          challengeTitle={level.challenge?.title ?? null}
          locked={!state.isPlayable}
          lockMessage={lockMessage}
          isCompleted={state.isCompleted}
          onStart={startChallenge}
          onClose={() => {
            setModal('none');
          }}
        />
      ) : null}

      {modal === 'door' ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setModal('none');
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Locked gate"
            className="w-full max-w-md rounded-2xl border border-amber-300/30 bg-[#1a1206] p-6 text-center"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <p className="text-4xl" aria-hidden="true">
              🔒
            </p>
            <h2 className="mt-3 text-xl font-black text-amber-200">Gate locked</h2>
            <p className="mt-2 text-sm text-slate-300">{config.doorLabel}</p>
            <p className="mt-3 text-sm font-bold text-amber-200">{lockMessage}</p>
            <button
              type="button"
              onClick={() => {
                setModal('none');
              }}
              className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-bold"
            >
              Step back
            </button>
          </div>
        </div>
      ) : null}

      <RoomCompletionOverlay
        open={modal === 'complete'}
        config={config}
        worldName={world.name}
        worldId={world.id}
        nextRoomPath={nextRoomPath}
        keyTitle={level.grantsRoomKey?.title ?? null}
        onClose={() => {
          setModal('none');
          onRefresh();
        }}
      />
    </div>
  );
}
