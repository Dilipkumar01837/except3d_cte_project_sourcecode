/**
 * Derives everything the room UI shows from the server's level payload.
 *
 * Completion and access are never computed on the client: they are read straight
 * from the player-scoped level list, so the room can only look "cleared" when the
 * backend already awarded it. This module is pure and unit tested.
 */

import type { WorldLevel } from '@/features/worlds/lib/world-api';

export interface RoomObjective {
  id: 'clue' | 'puzzle' | 'escape';
  label: string;
  done: boolean;
}

export interface RoomState {
  isCompleted: boolean;
  /** Open for play (or already cleared); a LOCKED/SEQUENTIAL room is sealed. */
  isPlayable: boolean;
  clueRead: boolean;
  objectives: RoomObjective[];
}

export function isRoomPlayable(level: Pick<WorldLevel, 'access' | 'isCompleted'>): boolean {
  return level.isCompleted || level.access === 'OPEN';
}

export function hasReadClue(level: Pick<WorldLevel, 'progress'>): boolean {
  return level.progress.some((entry) => entry.clueRead);
}

export function deriveRoomState(level: WorldLevel): RoomState {
  const isCompleted = level.isCompleted;
  const clueRead = hasReadClue(level);
  return {
    isCompleted,
    isPlayable: isRoomPlayable(level),
    clueRead,
    objectives: [
      { id: 'clue', label: 'Find the hidden clue', done: clueRead },
      { id: 'puzzle', label: 'Solve the puzzle terminal', done: isCompleted },
      { id: 'escape', label: 'Escape through the gate', done: isCompleted },
    ],
  };
}
