/**
 * EscapeRoom3D — main 3D escape-room component.
 *
 * This file contains only the top-level component logic (camera, proximity
 * detection, key handling, HUD). The heavy lifting is split across:
 *
 *   EscapeRoom3D-helpers.tsx      — PulsingLight, RotatingGear
 *   EscapeRoom3D-characters.tsx   — HumanPlayer, GuideNPC, TerminalKeeper
 *   EscapeRoom3D-environments.tsx — ForestEnv, CyberEnv, IceEnv, LavaEnv, SpaceEnv
 */

import type { FC } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { WorldLevel } from '@/features/worlds/lib/world-api';
import { sceneApi, type SceneState } from '../lib/scene-api';
import { HumanPlayer, GuideNPC, TerminalKeeper } from './EscapeRoom3D-characters';
import { CHAMBER_ENVS } from './EscapeRoom3D-environments';

// ─── Types ────────────────────────────────────────────────────────────────────

type NearbyObj = 'guide' | 'terminal' | 'door' | null;

interface InteractPoint {
  kind: NearbyObj;
  pos: THREE.Vector3;
}

// ─── NPC position config per chamber ─────────────────────────────────────────

const NPC_POS: Record<
  string,
  { guide: [number, number, number]; keeper: [number, number, number] }
> = {
  forest: { guide: [-3.5, 0, 1.2], keeper: [0, 0, -1.8] },
  cyber: { guide: [3.5, 0, 1.2], keeper: [0, 0, -1.8] },
  ice: { guide: [-4, 0, 1.2], keeper: [0, 0, -1.8] },
  lava: { guide: [3.2, 0, 1.2], keeper: [0, 0, -1.8] },
  space: { guide: [-3.5, 0, 1.2], keeper: [0, 0, -1.8] },
};

const BIOME_NPCS: Record<
  string,
  {
    guideSkin: string;
    guideOutfit: string;
    guideAccent: string;
    keeperSkin: string;
    keeperOutfit: string;
    keeperAccent: string;
    guideName: string;
  }
> = {
  forest: {
    guideSkin: '#c68642',
    guideOutfit: '#14532d',
    guideAccent: '#86efac',
    keeperSkin: '#f5cba7',
    keeperOutfit: '#065f46',
    keeperAccent: '#34d399',
    guideName: 'Elder Fern',
  },
  cyber: {
    guideSkin: '#f0d9b5',
    guideOutfit: '#4f46e5',
    guideAccent: '#a78bfa',
    keeperSkin: '#a0522d',
    keeperOutfit: '#0891b2',
    keeperAccent: '#22d3ee',
    guideName: 'Neo',
  },
  ice: {
    guideSkin: '#d5e8f0',
    guideOutfit: '#1e3a5f',
    guideAccent: '#7dd3fc',
    keeperSkin: '#e8d5c4',
    keeperOutfit: '#0369a1',
    keeperAccent: '#38bdf8',
    guideName: 'Lyra',
  },
  lava: {
    guideSkin: '#c0392b',
    guideOutfit: '#7c2d12',
    guideAccent: '#fb923c',
    keeperSkin: '#f5a623',
    keeperOutfit: '#9a3412',
    keeperAccent: '#f97316',
    guideName: 'Ignis',
  },
  space: {
    guideSkin: '#5e81ac',
    guideOutfit: '#1e1b4b',
    guideAccent: '#818cf8',
    keeperSkin: '#88c0d0',
    keeperOutfit: '#1e40af',
    keeperAccent: '#34d399',
    guideName: 'Orion',
  },
};

// Interact-point positions for proximity detection
const INTERACT_POINTS: Record<string, InteractPoint[]> = {
  forest: [
    { kind: 'guide', pos: new THREE.Vector3(-3.5, 0.9, 1.2) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 0.9, -1.8) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  cyber: [
    { kind: 'guide', pos: new THREE.Vector3(3.5, 0.9, 1.2) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 0.9, -1.8) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  ice: [
    { kind: 'guide', pos: new THREE.Vector3(-4, 0.9, 1.2) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 0.9, -1.8) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  lava: [
    { kind: 'guide', pos: new THREE.Vector3(3.2, 0.9, 1.2) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 0.9, -1.8) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  space: [
    { kind: 'guide', pos: new THREE.Vector3(-3.5, 0.9, 1.2) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 0.9, -1.8) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
};

const INTERACT_RADIUS = 3.0;

// ─── Per-chamber hint text ────────────────────────────────────────────────────

const GUIDE_HINTS: Record<string, string> = {
  forest:
    '"Walk to the terminal keeper and solve the coding puzzle. Complete the challenge to open the sealed gate and escape the forest!"',
  cyber:
    '"The neon city holds its secrets in code. Approach the Keeper and complete the challenge — the portal will unlock when you succeed."',
  ice: '"These frozen ruins respond only to type-safe code. The Keeper holds the challenge. Solve it and the passage thaws open for you."',
  lava: '"The forge demands tribute. Find the Keeper and conquer the coding trial. Only then will the iron gate yield to your will."',
  space:
    '"This sector is locked behind a coding checkpoint. Talk to the Keeper. Pass the challenge and the airlock will cycle open for you."',
};

// ─── World slug → chamber type ────────────────────────────────────────────────

function selectChamber(hint: string): 'forest' | 'cyber' | 'ice' | 'lava' | 'space' {
  if (hint.includes('javascript') || hint.includes('js')) return 'cyber';
  if (hint.includes('typescript') || hint.includes('ts')) return 'ice';
  if (hint.includes('rust') || hint.includes('c++') || hint.includes('cpp')) return 'lava';
  if (hint.includes('go') || hint.includes('galaxy')) return 'space';
  return 'forest';
}

const PLAYER_SHIRTS: Record<string, string> = {
  forest: '#16a34a',
  cyber: '#7c3aed',
  ice: '#0284c7',
  lava: '#c2410c',
  space: '#4338ca',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function EscapeRoom3D({
  level,
  completed,
  onChallenge,
  onClue,
  onDoor,
  onFallback,
}: {
  level: WorldLevel;
  completed: boolean;
  onChallenge: () => void;
  onClue: () => void;
  onDoor: () => void;
  onFallback: () => void;
}) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [playerPos, setPlayerPos] = useState(() => new THREE.Vector3(0, 0.9, 3.5));
  const [nearby, setNearby] = useState<NearbyObj>(null);

  const chamberType = useMemo(() => {
    const hint = level.description + ' ' + level.title;
    return selectChamber(hint.toLowerCase());
  }, [level.description, level.title]);

  const [sceneState, setSceneState] = useState<SceneState>({
    playerPosition: { x: 0, y: 0.9, z: 3.5 },
    unlockedObjects: [],
    sceneProgress: {},
  });
  useEffect(() => {
    void sceneApi
      .load(level.id)
      .then((r) => {
        setSceneState(r.state);
      })
      .catch(() => undefined);
  }, [level.id]);
  useEffect(() => {
    const t = window.setInterval(() => {
      void sceneApi.save(level.id, sceneState).catch(() => undefined);
    }, 5000);
    return () => {
      window.clearInterval(t);
    };
  }, [level.id, sceneState]);

  const handlePlayerMove = useCallback((p: THREE.Vector3) => {
    setPlayerPos(p.clone());
    setSceneState((c) => ({ ...c, playerPosition: { x: p.x, y: p.y, z: p.z } }));
  }, []);

  // Proximity detection
  useEffect(() => {
    const points = INTERACT_POINTS[chamberType] ?? [];
    let closest: NearbyObj = null;
    let bestDist = INTERACT_RADIUS;
    for (const pt of points) {
      const d = playerPos.distanceTo(pt.pos);
      if (d < bestDist) {
        bestDist = d;
        closest = pt.kind;
      }
    }
    setNearby(closest);
  }, [playerPos, chamberType]);

  // E key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || !nearby) return;
      e.preventDefault();
      if (nearby === 'terminal') onChallenge();
      else if (nearby === 'guide') onClue();
      else onDoor();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [nearby, onChallenge, onClue, onDoor]);

  // Non-nullable lookups — 'forest' key is always present; cast after ?? to narrow out undefined
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const npcPos = (NPC_POS[chamberType] ?? NPC_POS['forest'])!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const npcCfg = (BIOME_NPCS[chamberType] ?? BIOME_NPCS['forest'])!;
  const guideHint = GUIDE_HINTS[chamberType] ?? GUIDE_HINTS['forest'] ?? '';
  const playerShirt = PLAYER_SHIRTS[chamberType] ?? '#16a34a';

  const bgColor: Record<string, string> = {
    forest: '#030f09',
    cyber: '#050010',
    ice: '#020c1b',
    lava: '#120302',
    space: '#000208',
  };

  // Chamber-specific background environment (lights + floor + walls + decor)
  const ChamberEnv: FC<{ completed: boolean; doorPos: [number, number, number] }> = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    () => (CHAMBER_ENVS[chamberType] ?? CHAMBER_ENVS['forest'])!,
    [chamberType],
  );

  const doorPos: [number, number, number] = [0, 1.8, -7.4];

  return (
    <section
      className="relative h-[min(74vh,700px)] overflow-hidden rounded-2xl border border-white/10"
      style={{ background: bgColor[chamberType] ?? '#030f09' }}
      aria-label="3D escape room"
    >
      <Canvas
        shadows
        dpr={quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]}
        camera={{ position: [0, 5, 10], fov: 50 }}
        fallback={
          <div className="grid h-full place-items-center text-sm text-slate-300">
            WebGL unavailable — switch to 2D.
          </div>
        }
      >
        {/* Background environment */}
        <ChamberEnv completed={completed} doorPos={doorPos} />

        {/* Guide NPC — gives hint */}
        <GuideNPC
          position={npcPos.guide}
          playerPos={playerPos}
          isNearby={nearby === 'guide'}
          hintText={guideHint}
          name={npcCfg.guideName}
          skinColor={npcCfg.guideSkin}
          outfitColor={npcCfg.guideOutfit}
          accentColor={npcCfg.guideAccent}
        />

        {/* Terminal Keeper NPC — gives challenge */}
        <TerminalKeeper
          position={npcPos.keeper}
          playerPos={playerPos}
          isNearby={nearby === 'terminal'}
          completed={completed}
          challengeTitle={level.challenge?.title}
          skinColor={npcCfg.keeperSkin}
          outfitColor={npcCfg.keeperOutfit}
          accentColor={npcCfg.keeperAccent}
        />

        {/* Player */}
        <HumanPlayer
          skinColor="#f5cba7"
          shirtColor={playerShirt}
          onPositionChange={handlePlayerMove}
        />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          target={[0, 1.2, -1]}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI * 0.62}
        />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onFallback}
            className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur"
          >
            Switch to 2D
          </button>
          <label className="rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-xs text-white backdrop-blur">
            Quality{' '}
            <select
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value as typeof quality);
              }}
              className="ml-1 bg-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <div className="rounded-lg border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur">
          {level.title}
        </div>
      </div>

      {/* Bottom interaction hint */}
      {nearby && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
          <span
            className="flex items-center gap-2 rounded-full border bg-black/80 px-5 py-2 text-sm font-bold backdrop-blur"
            style={{ borderColor: npcCfg.guideAccent + '66', color: npcCfg.guideAccent }}
          >
            <kbd className="rounded border border-current bg-white/10 px-2 py-0.5 text-xs text-white">
              E
            </kbd>
            {nearby === 'guide'
              ? `Talk to ${npcCfg.guideName}`
              : nearby === 'terminal'
                ? 'Talk to the Keeper'
                : completed
                  ? 'Escape the room'
                  : 'Try the gate'}
          </span>
        </div>
      )}

      <p className="pointer-events-none absolute inset-x-3 bottom-2 text-center text-[10px] text-slate-600">
        WASD · walk &nbsp;|&nbsp; Drag · orbit &nbsp;|&nbsp; E · interact with characters
      </p>
    </section>
  );
}
