/**
 * Data-only definitions for each 2D room.
 *
 * Adding a room should not require new components: the room page resolves a
 * config by `${worldSlug}:${levelNumber}` and falls back to a generated layout
 * for any world that has no bespoke config yet. Coordinates are in a fixed
 * 1000x600 room space shared by the canvas and the collision maths.
 */

import type { Bounds, Rect, Vec2 } from './room-geometry';

export interface RoomTheme {
  id: string;
  /** CSS background for the room sky/back wall. */
  sky: string;
  /** CSS background for the floor. */
  ground: string;
  accent: string;
  player: string;
}

export type RoomObjectKind = 'clue' | 'terminal' | 'door';

export interface RoomObjectConfig {
  id: string;
  kind: RoomObjectKind;
  label: string;
  /** Centre of the object in room coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Copy shown in the interaction prompt. */
  prompt: string;
}

export interface RoomConfig {
  key: string;
  title: string;
  subtitle: string;
  theme: RoomTheme;
  bounds: Bounds;
  spawn: Vec2;
  obstacles: Rect[];
  objects: RoomObjectConfig[];
  clueText: string;
  doorLabel: string;
}

export const ROOM_PLAYER_HALF = 16;
export const INTERACTION_RADIUS = 84;

const BOUNDS: Bounds = { width: 1000, height: 600 };

const FOREST_CLEARING: RoomTheme = {
  id: 'forest-clearing',
  sky: 'linear-gradient(180deg, #0b2a1a 0%, #14532d 55%, #166534 100%)',
  ground: 'linear-gradient(180deg, #1a5c34 0%, #14532d 100%)',
  accent: '#86efac',
  player: '#fde047',
};

const FOREST_FORK: RoomTheme = {
  id: 'forest-fork',
  sky: 'linear-gradient(180deg, #06201c 0%, #0f3d34 60%, #115e50 100%)',
  ground: 'linear-gradient(180deg, #134e46 0%, #0f3d34 100%)',
  accent: '#5eead4',
  player: '#fef08a',
};

const FOREST_RIDGE: RoomTheme = {
  id: 'forest-ridge',
  sky: 'linear-gradient(180deg, #1b1233 0%, #2d2350 55%, #3b3170 100%)',
  ground: 'linear-gradient(180deg, #3b3170 0%, #2d2350 100%)',
  accent: '#c4b5fd',
  player: '#fde047',
};

const JAVA_LAKE: RoomTheme = {
  id: 'java-lake',
  sky: 'linear-gradient(180deg, #082f49 0%, #0c4a6e 60%, #075985 100%)',
  ground: 'linear-gradient(180deg, #0e7490 0%, #155e75 100%)',
  accent: '#7dd3fc',
  player: '#fef08a',
};

function object(
  id: string,
  kind: RoomObjectKind,
  label: string,
  x: number,
  y: number,
  prompt: string,
): RoomObjectConfig {
  const size =
    kind === 'door'
      ? { width: 64, height: 128 }
      : kind === 'terminal'
        ? { width: 76, height: 76 }
        : { width: 48, height: 48 };
  return { id, kind, label, x, y, width: size.width, height: size.height, prompt };
}

const ROOM_CONFIGS: Record<string, RoomConfig> = {
  'python-forest:1': {
    key: 'python-forest:1',
    title: 'First Clearing',
    subtitle: 'A quiet glade at the edge of the Python Forest.',
    theme: FOREST_CLEARING,
    bounds: BOUNDS,
    spawn: { x: 110, y: 500 },
    obstacles: [
      { x: 180, y: 60, width: 90, height: 70 },
      { x: 640, y: 120, width: 80, height: 80 },
      { x: 360, y: 430, width: 110, height: 70 },
      { x: 760, y: 440, width: 90, height: 80 },
    ],
    objects: [
      object('clue', 'clue', 'Mossy stone', 210, 170, 'Press E to read the carving'),
      object('terminal', 'terminal', 'Puzzle terminal', 520, 300, 'Press E to use the terminal'),
      object('door', 'door', 'Sunlit Path', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      'A carving glows in the moss: "To leave the clearing, teach the stone to add. Two numbers in, their sum out."',
    doorLabel: 'Sunlit Path',
  },
  'python-forest:2': {
    key: 'python-forest:2',
    title: 'Split Path',
    subtitle: 'The trail forks here, and only one branch is true.',
    theme: FOREST_FORK,
    bounds: BOUNDS,
    spawn: { x: 110, y: 110 },
    obstacles: [
      { x: 430, y: 80, width: 60, height: 200 },
      { x: 430, y: 360, width: 60, height: 180 },
      { x: 700, y: 180, width: 110, height: 80 },
      { x: 180, y: 240, width: 80, height: 90 },
    ],
    objects: [
      object('clue', 'clue', 'Forked signpost', 250, 470, 'Press E to read the signpost'),
      object('terminal', 'terminal', 'Puzzle terminal', 500, 250, 'Press E to use the terminal'),
      object('door', 'door', 'Split Gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      'The signpost reads: "Two roads run as numbers past the fork. Guard the even one, and the gate will notice."',
    doorLabel: 'Split Gate',
  },
  'python-forest:3': {
    key: 'python-forest:3',
    title: 'High Ridge',
    subtitle: 'A cold ridge, chained shut until the trail key turns.',
    theme: FOREST_RIDGE,
    bounds: BOUNDS,
    spawn: { x: 120, y: 500 },
    obstacles: [
      { x: 300, y: 80, width: 120, height: 90 },
      { x: 620, y: 120, width: 100, height: 110 },
      { x: 660, y: 420, width: 120, height: 80 },
      { x: 250, y: 380, width: 90, height: 70 },
    ],
    objects: [
      object('clue', 'clue', 'Wind-worn cairn', 180, 150, 'Press E to read the cairn'),
      object('terminal', 'terminal', 'Puzzle terminal', 480, 280, 'Press E to use the terminal'),
      object('door', 'door', 'Ridge Gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      'The cairn is scratched with three marks: "Of three who climb, only the greatest passes the ridge."',
    doorLabel: 'Ridge Gate',
  },
};

function generatedConfig(worldSlug: string, levelNumber: number, title: string): RoomConfig {
  return {
    key: `${worldSlug}:${String(levelNumber)}`,
    title: title || `Room ${String(levelNumber)}`,
    subtitle: 'A new chamber on your escape route.',
    theme: JAVA_LAKE,
    bounds: BOUNDS,
    spawn: { x: 110, y: 500 },
    obstacles: [
      { x: 300, y: 100, width: 100, height: 80 },
      { x: 640, y: 380, width: 110, height: 80 },
    ],
    objects: [
      object('clue', 'clue', 'Carved stone', 220, 170, 'Press E to read the carving'),
      object('terminal', 'terminal', 'Puzzle terminal', 520, 300, 'Press E to use the terminal'),
      object('door', 'door', title || 'Exit gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText: 'A faint inscription hums, waiting for your code to set it free.',
    doorLabel: title || 'Exit gate',
  };
}

export function resolveRoomConfig(
  worldSlug: string,
  levelNumber: number,
  levelTitle: string,
): RoomConfig {
  return (
    ROOM_CONFIGS[`${worldSlug}:${String(levelNumber)}`] ??
    generatedConfig(worldSlug, levelNumber, levelTitle)
  );
}
