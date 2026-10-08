/**
 * Data-only definitions for each 2D room.
 *
 * Adding a room does not require new components: the room page resolves a
 * config by `${worldSlug}:${levelNumber}` and falls back to a generated layout
 * for any world that has no bespoke config yet. Coordinates are in a fixed
 * 1000x600 room space shared by the canvas and the collision maths.
 *
 * 15 hand-crafted rooms across 5 worlds:
 *   python-forest       levels 1–3  (bioluminescent jungle)
 *   javascript-jungle   levels 1–3  (neon cyber-lab)
 *   typescript-tundra   levels 1–3  (frozen arctic ruins)
 *   rust-realm          levels 1–3  (industrial lava forge)
 *   go-galaxy           levels 1–3  (deep-space station)
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

// ─── Themes ──────────────────────────────────────────────────────────────────

const FOREST_CLEARING: RoomTheme = {
  id: 'forest-clearing',
  sky: 'linear-gradient(180deg, #041a0d 0%, #0d3d20 55%, #14532d 100%)',
  ground: 'linear-gradient(180deg, #1a5c34 0%, #14532d 100%)',
  accent: '#86efac',
  player: '#fde047',
};

const FOREST_FORK: RoomTheme = {
  id: 'forest-fork',
  sky: 'linear-gradient(180deg, #051a14 0%, #0f3d34 60%, #115e50 100%)',
  ground: 'linear-gradient(180deg, #134e46 0%, #0f3d34 100%)',
  accent: '#5eead4',
  player: '#fef08a',
};

const FOREST_RIDGE: RoomTheme = {
  id: 'forest-ridge',
  sky: 'linear-gradient(180deg, #120e2b 0%, #2d2350 55%, #3b3170 100%)',
  ground: 'linear-gradient(180deg, #3b3170 0%, #2d2350 100%)',
  accent: '#c4b5fd',
  player: '#fde047',
};

const CYBER_GRID: RoomTheme = {
  id: 'cyber-grid',
  sky: 'linear-gradient(180deg, #020012 0%, #0c0040 60%, #150060 100%)',
  ground: 'linear-gradient(180deg, #1a0070 0%, #0c0040 100%)',
  accent: '#a78bfa',
  player: '#22d3ee',
};

const CYBER_CORE: RoomTheme = {
  id: 'cyber-core',
  sky: 'linear-gradient(180deg, #000d18 0%, #04304a 55%, #075985 100%)',
  ground: 'linear-gradient(180deg, #0369a1 0%, #075985 100%)',
  accent: '#38bdf8',
  player: '#f0abfc',
};

const CYBER_NEXUS: RoomTheme = {
  id: 'cyber-nexus',
  sky: 'linear-gradient(180deg, #02000f 0%, #1e0050 50%, #4c0080 100%)',
  ground: 'linear-gradient(180deg, #5b21b6 0%, #3730a3 100%)',
  accent: '#e879f9',
  player: '#fbcfe8',
};

const TUNDRA_PLAINS: RoomTheme = {
  id: 'tundra-plains',
  sky: 'linear-gradient(180deg, #020c1b 0%, #0c2340 55%, #1e3a5f 100%)',
  ground: 'linear-gradient(180deg, #1e40af 0%, #1e3a5f 100%)',
  accent: '#93c5fd',
  player: '#fef9c3',
};

const TUNDRA_VAULT: RoomTheme = {
  id: 'tundra-vault',
  sky: 'linear-gradient(180deg, #040c20 0%, #0f2744 55%, #1d4ed8 100%)',
  ground: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
  accent: '#7dd3fc',
  player: '#e0f2fe',
};

const TUNDRA_SPIRE: RoomTheme = {
  id: 'tundra-spire',
  sky: 'linear-gradient(180deg, #01060f 0%, #0a1830 55%, #172554 100%)',
  ground: 'linear-gradient(180deg, #1e3a8a 0%, #172554 100%)',
  accent: '#bfdbfe',
  player: '#fef08a',
};

const FORGE_ENTRY: RoomTheme = {
  id: 'forge-entry',
  sky: 'linear-gradient(180deg, #0f0402 0%, #3b1108 55%, #7c2d12 100%)',
  ground: 'linear-gradient(180deg, #9a3412 0%, #7c2d12 100%)',
  accent: '#fb923c',
  player: '#fef08a',
};

const FORGE_CORE: RoomTheme = {
  id: 'forge-core',
  sky: 'linear-gradient(180deg, #1a0200 0%, #5c0a00 55%, #991b1b 100%)',
  ground: 'linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)',
  accent: '#fca5a5',
  player: '#fef9c3',
};

const FORGE_APEX: RoomTheme = {
  id: 'forge-apex',
  sky: 'linear-gradient(180deg, #0f0300 0%, #431407 50%, #7c2d12 100%)',
  ground: 'linear-gradient(180deg, #c2410c 0%, #9a3412 100%)',
  accent: '#fdba74',
  player: '#fef08a',
};

const GALAXY_DOCK: RoomTheme = {
  id: 'galaxy-dock',
  sky: 'linear-gradient(180deg, #000208 0%, #060d1f 55%, #0f172a 100%)',
  ground: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
  accent: '#818cf8',
  player: '#34d399',
};

const GALAXY_BRIDGE: RoomTheme = {
  id: 'galaxy-bridge',
  sky: 'linear-gradient(180deg, #000105 0%, #04091a 55%, #0d1b3e 100%)',
  ground: 'linear-gradient(180deg, #1e2a5e 0%, #0d1b3e 100%)',
  accent: '#a5b4fc',
  player: '#6ee7b7',
};

const GALAXY_CORE: RoomTheme = {
  id: 'galaxy-core',
  sky: 'linear-gradient(180deg, #000010 0%, #08003a 50%, #1a006a 100%)',
  ground: 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)',
  accent: '#c7d2fe',
  player: '#6ee7b7',
};

// ─── Helper ──────────────────────────────────────────────────────────────────

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

// ─── Room definitions ─────────────────────────────────────────────────────────

const ROOM_CONFIGS: Record<string, RoomConfig> = {
  // ── PYTHON FOREST ──────────────────────────────────────────────────────────
  'python-forest:1': {
    key: 'python-forest:1',
    title: 'First Clearing',
    subtitle: 'A quiet bioluminescent glade at the edge of the Python Forest.',
    theme: FOREST_CLEARING,
    bounds: BOUNDS,
    spawn: { x: 110, y: 500 },
    obstacles: [
      { x: 160, y: 60, width: 100, height: 80 },
      { x: 620, y: 100, width: 90, height: 90 },
      { x: 340, y: 420, width: 120, height: 70 },
      { x: 740, y: 430, width: 100, height: 80 },
    ],
    objects: [
      object('clue', 'clue', 'Mossy stone', 220, 180, 'Press E to read the carving'),
      object(
        'terminal',
        'terminal',
        'Puzzle terminal',
        510,
        300,
        'Press E to activate the terminal',
      ),
      object('door', 'door', 'Sunlit Path', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      '"To leave the clearing, teach the stone to add. Two numbers enter, their sum must come out. Guard the path with your function."',
    doorLabel: 'Sunlit Path',
  },
  'python-forest:2': {
    key: 'python-forest:2',
    title: 'Split Path',
    subtitle: 'The trail forks here. Even numbers take the true road.',
    theme: FOREST_FORK,
    bounds: BOUNDS,
    spawn: { x: 110, y: 110 },
    obstacles: [
      { x: 400, y: 80, width: 70, height: 200 },
      { x: 400, y: 360, width: 70, height: 180 },
      { x: 680, y: 170, width: 120, height: 90 },
      { x: 160, y: 250, width: 90, height: 100 },
    ],
    objects: [
      object('clue', 'clue', 'Forked signpost', 260, 470, 'Press E to read the signpost'),
      object(
        'terminal',
        'terminal',
        'Puzzle terminal',
        490,
        260,
        'Press E to activate the terminal',
      ),
      object('door', 'door', 'Split Gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      '"Two roads diverge in the Python Forest. The even road is the true one. Guard the even number and the gate senses your intent."',
    doorLabel: 'Split Gate',
  },
  'python-forest:3': {
    key: 'python-forest:3',
    title: 'High Ridge',
    subtitle: 'A cold ridge overlooking the forest. Only the greatest survives.',
    theme: FOREST_RIDGE,
    bounds: BOUNDS,
    spawn: { x: 120, y: 490 },
    obstacles: [
      { x: 280, y: 80, width: 130, height: 95 },
      { x: 600, y: 110, width: 110, height: 115 },
      { x: 640, y: 410, width: 130, height: 85 },
      { x: 230, y: 370, width: 100, height: 80 },
      { x: 480, y: 480, width: 80, height: 60 },
    ],
    objects: [
      object('clue', 'clue', 'Wind-worn cairn', 190, 160, 'Press E to read the cairn'),
      object(
        'terminal',
        'terminal',
        'Puzzle terminal',
        470,
        270,
        'Press E to activate the terminal',
      ),
      object('door', 'door', 'Ridge Gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      '"Of three who climb the ridge, only the greatest passes through. Return the maximum of three numbers or the gate stays shut forever."',
    doorLabel: 'Ridge Gate',
  },

  // ── JAVASCRIPT JUNGLE ──────────────────────────────────────────────────────
  'javascript-jungle:1': {
    key: 'javascript-jungle:1',
    title: 'Neon Threshold',
    subtitle: 'Pulsing arrays and mutating variables light the corridor.',
    theme: CYBER_GRID,
    bounds: BOUNDS,
    spawn: { x: 100, y: 300 },
    obstacles: [
      { x: 260, y: 80, width: 60, height: 180 },
      { x: 260, y: 330, width: 60, height: 180 },
      { x: 540, y: 150, width: 100, height: 80 },
      { x: 700, y: 360, width: 90, height: 90 },
    ],
    objects: [
      object('clue', 'clue', 'Data pad', 380, 440, 'Press E to read the data pad'),
      object('terminal', 'terminal', 'Array console', 530, 290, 'Press E to activate the console'),
      object('door', 'door', 'Access Hatch', 962, 300, 'Press E to force the hatch'),
    ],
    clueText:
      '"Arrays hold the city\'s secrets. Sum every element in the array and the hatch registers your clearance."',
    doorLabel: 'Access Hatch',
  },
  'javascript-jungle:2': {
    key: 'javascript-jungle:2',
    title: 'The Callback Den',
    subtitle: 'Events fire in the dark. Promises glow in every alcove.',
    theme: CYBER_CORE,
    bounds: BOUNDS,
    spawn: { x: 110, y: 490 },
    obstacles: [
      { x: 200, y: 60, width: 80, height: 140 },
      { x: 450, y: 80, width: 90, height: 80 },
      { x: 650, y: 70, width: 80, height: 120 },
      { x: 320, y: 380, width: 110, height: 80 },
      { x: 720, y: 420, width: 90, height: 100 },
    ],
    objects: [
      object('clue', 'clue', 'Broken promise', 190, 270, 'Press E to inspect the promise'),
      object('terminal', 'terminal', 'Event emitter', 510, 280, 'Press E to trigger the emitter'),
      object('door', 'door', 'Async Gate', 962, 300, 'Press E to resolve the gate'),
    ],
    clueText:
      '"A promise once broken must be fixed. Filter the array and keep only the elements that pass the test. The gate resolves on truth."',
    doorLabel: 'Async Gate',
  },
  'javascript-jungle:3': {
    key: 'javascript-jungle:3',
    title: 'Prototype Spire',
    subtitle: "The city's apex. Closures wrap every secret in scope.",
    theme: CYBER_NEXUS,
    bounds: BOUNDS,
    spawn: { x: 110, y: 500 },
    obstacles: [
      { x: 300, y: 100, width: 60, height: 300 },
      { x: 580, y: 100, width: 60, height: 300 },
      { x: 440, y: 460, width: 120, height: 80 },
      { x: 160, y: 400, width: 90, height: 80 },
      { x: 700, y: 80, width: 80, height: 70 },
    ],
    objects: [
      object('clue', 'clue', 'Scope diagram', 220, 180, 'Press E to study the diagram'),
      object('terminal', 'terminal', 'Closure engine', 440, 270, 'Press E to enter the engine'),
      object('door', 'door', 'Nexus Portal', 962, 300, 'Press E to open the portal'),
    ],
    clueText:
      '"Closures hide the city\'s crown. Write a counter factory that returns a function. Each call increments and returns its private count."',
    doorLabel: 'Nexus Portal',
  },

  // ── TYPESCRIPT TUNDRA ──────────────────────────────────────────────────────
  'typescript-tundra:1': {
    key: 'typescript-tundra:1',
    title: 'Frozen Outpost',
    subtitle: 'Typed ruins half-buried in permafrost. Interfaces freeze the air.',
    theme: TUNDRA_PLAINS,
    bounds: BOUNDS,
    spawn: { x: 110, y: 490 },
    obstacles: [
      { x: 200, y: 80, width: 100, height: 90 },
      { x: 500, y: 60, width: 80, height: 110 },
      { x: 680, y: 100, width: 100, height: 80 },
      { x: 350, y: 430, width: 120, height: 80 },
      { x: 740, y: 390, width: 90, height: 90 },
    ],
    objects: [
      object('clue', 'clue', 'Ice tablet', 230, 190, 'Press E to read the ice tablet'),
      object('terminal', 'terminal', 'Type terminal', 500, 280, 'Press E to use the terminal'),
      object('door', 'door', 'Frost Gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      '"The tundra enforces strict typing. Define an interface with a name (string) and age (number). Return the name and age as a formatted string."',
    doorLabel: 'Frost Gate',
  },
  'typescript-tundra:2': {
    key: 'typescript-tundra:2',
    title: 'The Type Vault',
    subtitle: 'Generics stretch across every frozen wall.',
    theme: TUNDRA_VAULT,
    bounds: BOUNDS,
    spawn: { x: 110, y: 300 },
    obstacles: [
      { x: 240, y: 60, width: 90, height: 200 },
      { x: 240, y: 340, width: 90, height: 160 },
      { x: 560, y: 130, width: 100, height: 90 },
      { x: 720, y: 360, width: 110, height: 90 },
    ],
    objects: [
      object('clue', 'clue', 'Frozen scroll', 400, 460, 'Press E to read the scroll'),
      object('terminal', 'terminal', 'Generic forge', 540, 270, 'Press E to forge a type'),
      object('door', 'door', 'Vault Door', 962, 300, 'Press E to unlock the vault'),
    ],
    clueText:
      '"Generics hold what concretes cannot. Write a generic identity function that accepts any type T and returns it unchanged. Type and value are one."',
    doorLabel: 'Vault Door',
  },
  'typescript-tundra:3': {
    key: 'typescript-tundra:3',
    title: 'Spire of Inference',
    subtitle: 'The summit where the compiler sees all.',
    theme: TUNDRA_SPIRE,
    bounds: BOUNDS,
    spawn: { x: 120, y: 500 },
    obstacles: [
      { x: 300, y: 70, width: 120, height: 100 },
      { x: 600, y: 90, width: 110, height: 120 },
      { x: 250, y: 380, width: 100, height: 80 },
      { x: 650, y: 400, width: 120, height: 90 },
      { x: 460, y: 450, width: 80, height: 70 },
    ],
    objects: [
      object('clue', 'clue', 'Compiler rune', 180, 160, 'Press E to read the rune'),
      object('terminal', 'terminal', 'Inference engine', 490, 260, 'Press E to access the engine'),
      object('door', 'door', 'Apex Gate', 962, 300, 'Press E to open the apex gate'),
    ],
    clueText:
      '"At the spire, union types split the path. Write a function that accepts a string or number and returns its string representation."',
    doorLabel: 'Apex Gate',
  },

  // ── RUST REALM ─────────────────────────────────────────────────────────────
  'rust-realm:1': {
    key: 'rust-realm:1',
    title: 'Forge Entrance',
    subtitle: 'Iron walls and the smell of molten ownership. Borrowing is the only currency.',
    theme: FORGE_ENTRY,
    bounds: BOUNDS,
    spawn: { x: 110, y: 490 },
    obstacles: [
      { x: 220, y: 80, width: 110, height: 90 },
      { x: 560, y: 70, width: 100, height: 100 },
      { x: 720, y: 80, width: 90, height: 90 },
      { x: 340, y: 400, width: 130, height: 90 },
      { x: 680, y: 400, width: 100, height: 80 },
    ],
    objects: [
      object('clue', 'clue', 'Ownership rune', 240, 200, 'Press E to read the rune'),
      object('terminal', 'terminal', 'Forge terminal', 510, 280, 'Press E to use the terminal'),
      object('door', 'door', 'Iron Gate', 962, 300, 'Press E to open the gate'),
    ],
    clueText:
      '"The forge demands ownership. Write a function that takes ownership of a String and returns its length. The borrow checker watches."',
    doorLabel: 'Iron Gate',
  },
  'rust-realm:2': {
    key: 'rust-realm:2',
    title: 'Borrow Pits',
    subtitle: 'Lifetimes extend through every pit. Misuse them and the walls close.',
    theme: FORGE_CORE,
    bounds: BOUNDS,
    spawn: { x: 110, y: 300 },
    obstacles: [
      { x: 250, y: 60, width: 80, height: 210 },
      { x: 250, y: 340, width: 80, height: 170 },
      { x: 560, y: 120, width: 110, height: 100 },
      { x: 700, y: 350, width: 100, height: 100 },
    ],
    objects: [
      object('clue', 'clue', 'Lifetime marker', 410, 460, 'Press E to study the marker'),
      object('terminal', 'terminal', 'Borrow checker', 540, 280, 'Press E to use the terminal'),
      object('door', 'door', 'Pit Gate', 962, 300, 'Press E to open the pit gate'),
    ],
    clueText:
      '"References must not outlive what they point at. Write a function that returns the longer of two string slices, annotating the lifetime correctly."',
    doorLabel: 'Pit Gate',
  },
  'rust-realm:3': {
    key: 'rust-realm:3',
    title: 'Core Furnace',
    subtitle: 'Enums and pattern matching fuel the deepest furnace.',
    theme: FORGE_APEX,
    bounds: BOUNDS,
    spawn: { x: 120, y: 500 },
    obstacles: [
      { x: 290, y: 80, width: 130, height: 100 },
      { x: 610, y: 100, width: 120, height: 120 },
      { x: 240, y: 390, width: 110, height: 90 },
      { x: 660, y: 410, width: 120, height: 90 },
      { x: 470, y: 460, width: 80, height: 70 },
    ],
    objects: [
      object('clue', 'clue', 'Furnace plaque', 190, 170, 'Press E to read the plaque'),
      object('terminal', 'terminal', 'Pattern forge', 480, 270, 'Press E to enter the forge'),
      object('door', 'door', 'Furnace Gate', 962, 300, 'Press E to open the furnace gate'),
    ],
    clueText:
      '"The furnace runs on matched arms. Define an enum with at least two variants. Use a match expression to return a different string for each variant."',
    doorLabel: 'Furnace Gate',
  },

  // ── GO GALAXY ──────────────────────────────────────────────────────────────
  'go-galaxy:1': {
    key: 'go-galaxy:1',
    title: 'Docking Bay',
    subtitle: 'Goroutines orbit in silent formation. Channels carry the signal.',
    theme: GALAXY_DOCK,
    bounds: BOUNDS,
    spawn: { x: 110, y: 490 },
    obstacles: [
      { x: 220, y: 80, width: 100, height: 80 },
      { x: 530, y: 70, width: 90, height: 100 },
      { x: 700, y: 80, width: 100, height: 90 },
      { x: 350, y: 410, width: 120, height: 85 },
      { x: 720, y: 410, width: 95, height: 85 },
    ],
    objects: [
      object('clue', 'clue', 'Signal array', 240, 195, 'Press E to read the signal'),
      object('terminal', 'terminal', 'Nav computer', 510, 275, 'Press E to use the computer'),
      object('door', 'door', 'Bay Airlock', 962, 300, 'Press E to open the airlock'),
    ],
    clueText:
      '"The bay records all transmissions. Write a function that accepts a slice of integers and returns their sum. Concurrency starts simple."',
    doorLabel: 'Bay Airlock',
  },
  'go-galaxy:2': {
    key: 'go-galaxy:2',
    title: 'Engine Room',
    subtitle: 'Goroutines spin the engine. Channels connect every component.',
    theme: GALAXY_BRIDGE,
    bounds: BOUNDS,
    spawn: { x: 110, y: 300 },
    obstacles: [
      { x: 260, y: 60, width: 80, height: 200 },
      { x: 260, y: 340, width: 80, height: 160 },
      { x: 570, y: 110, width: 110, height: 100 },
      { x: 720, y: 360, width: 110, height: 100 },
    ],
    objects: [
      object('clue', 'clue', 'Goroutine log', 410, 460, 'Press E to read the log'),
      object('terminal', 'terminal', 'Engine console', 540, 275, 'Press E to access the console'),
      object('door', 'door', 'Engine Hatch', 962, 300, 'Press E to open the hatch'),
    ],
    clueText:
      '"The engine reads maps. Write a function that counts the frequency of each word in a slice of strings, returning a map[string]int."',
    doorLabel: 'Engine Hatch',
  },
  'go-galaxy:3': {
    key: 'go-galaxy:3',
    title: 'Reactor Core',
    subtitle: 'The heart of the galaxy ship. Interfaces define every system.',
    theme: GALAXY_CORE,
    bounds: BOUNDS,
    spawn: { x: 120, y: 500 },
    obstacles: [
      { x: 290, y: 80, width: 130, height: 100 },
      { x: 620, y: 100, width: 120, height: 120 },
      { x: 250, y: 380, width: 110, height: 90 },
      { x: 670, y: 400, width: 120, height: 90 },
      { x: 470, y: 460, width: 80, height: 70 },
    ],
    objects: [
      object('clue', 'clue', 'Core interface', 195, 170, 'Press E to read the interface'),
      object('terminal', 'terminal', 'Reactor terminal', 480, 265, 'Press E to enter the reactor'),
      object('door', 'door', 'Reactor Gate', 962, 300, 'Press E to open the reactor gate'),
    ],
    clueText:
      '"The reactor core runs on interfaces. Implement the Stringer interface: define a struct and a String() method that returns a formatted description."',
    doorLabel: 'Reactor Gate',
  },
};

// ─── Generated fallback ────────────────────────────────────────────────────

function generatedConfig(worldSlug: string, levelNumber: number, title: string): RoomConfig {
  // Pick a theme based on world slug for a more cohesive fallback.
  let theme = GALAXY_DOCK;
  if (worldSlug.includes('python')) theme = FOREST_CLEARING;
  else if (worldSlug.includes('javascript') || worldSlug.includes('js')) theme = CYBER_GRID;
  else if (worldSlug.includes('typescript') || worldSlug.includes('ts')) theme = TUNDRA_PLAINS;
  else if (worldSlug.includes('rust') || worldSlug.includes('cpp') || worldSlug.includes('c++'))
    theme = FORGE_ENTRY;

  return {
    key: `${worldSlug}:${String(levelNumber)}`,
    title: title || `Room ${String(levelNumber)}`,
    subtitle: 'A new chamber on your escape route.',
    theme,
    bounds: BOUNDS,
    spawn: { x: 110, y: 490 },
    obstacles: [
      { x: 300, y: 100, width: 100, height: 80 },
      { x: 640, y: 380, width: 110, height: 80 },
      { x: 450, y: 220, width: 80, height: 70 },
    ],
    objects: [
      object('clue', 'clue', 'Carved stone', 220, 170, 'Press E to read the carving'),
      object('terminal', 'terminal', 'Puzzle terminal', 510, 295, 'Press E to use the terminal'),
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
