import type { FC } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles, Float, Stars } from '@react-three/drei';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { WorldLevel } from '@/features/worlds/lib/world-api';
import { sceneApi, type SceneState } from '../lib/scene-api';

// ─── Types ────────────────────────────────────────────────────────────────────

type NearbyObj = 'guide' | 'terminal' | 'door' | null;

interface InteractPoint {
  kind: NearbyObj;
  pos: THREE.Vector3;
}

// ─── Humanoid Player ──────────────────────────────────────────────────────────
// Built from primitive meshes: head sphere, torso box, two arms, two legs.
// Moves with WASD, turns to face movement direction, arm-swings while walking.

function HumanPlayer({
  skinColor,
  shirtColor,
  onPositionChange,
}: {
  skinColor: string;
  shirtColor: string;
  onPositionChange: (pos: THREE.Vector3) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const keys = useRef(new Set<string>());
  const pos = useRef(new THREE.Vector3(0, 0, 3.5));
  const facing = useRef(new THREE.Euler(0, Math.PI, 0)); // start facing into room

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const d = Math.min(delta, 0.05) * 4.5;
    const dx = (Number(keys.current.has('d')) - Number(keys.current.has('a'))) * d;
    const dz = (Number(keys.current.has('s')) - Number(keys.current.has('w'))) * d;
    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      pos.current.x = THREE.MathUtils.clamp(pos.current.x + dx, -7.5, 7.5);
      pos.current.z = THREE.MathUtils.clamp(pos.current.z + dz, -6.0, 5.2);
      // face direction of travel
      facing.current.y = Math.atan2(dx, dz);
      onPositionChange(pos.current.clone());
    }

    if (groupRef.current) {
      // smooth position update
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        pos.current.x,
        0.25,
      );
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        pos.current.z,
        0.25,
      );
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 10) * (moving ? 0.05 : 0.02);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        facing.current.y,
        0.18,
      );
    }

    // arm / leg swing when walking
    const swing = moving
      ? Math.sin(clock.elapsedTime * 10) * 0.6
      : Math.sin(clock.elapsedTime * 1.5) * 0.05;
    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.7;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.7;

    if (glowRef.current)
      glowRef.current.position.set(pos.current.x, pos.current.y + 1, pos.current.z);
  });

  const skin = <meshStandardMaterial color={skinColor} roughness={0.7} />;
  const shirt = (
    <meshStandardMaterial
      color={shirtColor}
      emissive={shirtColor}
      emissiveIntensity={0.3}
      roughness={0.5}
    />
  );

  return (
    <group ref={groupRef} position={[0, 0, 3.5]}>
      {/* Head */}
      <mesh position={[0, 1.72, 0]} castShadow>
        {skin}
        <sphereGeometry args={[0.22, 10, 8]} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08, 1.77, 0.19]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.08, 1.77, 0.19]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.2, 0]} castShadow>
        {shirt}
        <boxGeometry args={[0.38, 0.55, 0.22]} />
      </mesh>
      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[0.27, 1.28, 0]} castShadow>
        <boxGeometry args={[0.12, 0.48, 0.12]} />
        {shirt}
      </mesh>
      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[-0.27, 1.28, 0]} castShadow>
        <boxGeometry args={[0.12, 0.48, 0.12]} />
        {shirt}
      </mesh>
      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[0.11, 0.72, 0]} castShadow>
        <boxGeometry args={[0.14, 0.46, 0.14]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[-0.11, 0.72, 0]} castShadow>
        <boxGeometry args={[0.14, 0.46, 0.14]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
      {/* Feet */}
      <mesh position={[0.11, 0.47, 0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[-0.11, 0.47, 0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* Player glow */}
      <pointLight ref={glowRef} color={shirtColor} intensity={2.5} distance={3.5} />
    </group>
  );
}

// ─── Guide NPC ────────────────────────────────────────────────────────────────
// A human figure that stands still, turns to face the player when nearby,
// waves their right arm, and shows a typed-out speech bubble hint.

function GuideNPC({
  position,
  playerPos,
  isNearby,
  hintText,
  name,
  skinColor,
  outfitColor,
  accentColor,
}: {
  position: [number, number, number];
  playerPos: THREE.Vector3;
  isNearby: boolean;
  hintText: string;
  name: string;
  skinColor: string;
  outfitColor: string;
  accentColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const waveRef = useRef<THREE.Mesh>(null);
  const [bubble, setBubble] = useState('');
  const charIdx = useRef(0);
  const typing = useRef(false);

  // Type out the hint text when player gets close
  useEffect(() => {
    if (isNearby && !typing.current) {
      typing.current = true;
      charIdx.current = 0;
      setBubble('');
      const interval = setInterval(() => {
        charIdx.current++;
        setBubble(hintText.slice(0, charIdx.current));
        if (charIdx.current >= hintText.length) clearInterval(interval);
      }, 28);
      return () => clearInterval(interval);
    }
    if (!isNearby) {
      typing.current = false;
      setBubble('');
      charIdx.current = 0;
    }
  }, [isNearby, hintText]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Turn to face the player smoothly
    const dx = playerPos.x - position[0];
    const dz = playerPos.z - position[2];
    const targetY = Math.atan2(dx, dz);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.06);

    // Wave right arm when player is nearby
    if (waveRef.current) {
      const wave = isNearby
        ? -0.6 + Math.sin(clock.elapsedTime * 4) * 0.8 // active wave
        : Math.sin(clock.elapsedTime * 1.2) * 0.08; // idle breathing
      waveRef.current.rotation.x = wave;
    }
  });

  const skin = <meshStandardMaterial color={skinColor} roughness={0.7} />;
  const outfit = (
    <meshStandardMaterial
      color={outfitColor}
      emissive={outfitColor}
      emissiveIntensity={0.2}
      roughness={0.5}
    />
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <mesh position={[0, 1.72, 0]} castShadow>
        {skin}
        <sphereGeometry args={[0.22, 10, 8]} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08, 1.77, 0.19]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.08, 1.77, 0.19]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Smile */}
      <mesh position={[0, 1.67, 0.2]} rotation={[0, 0, 0.1]}>
        <torusGeometry args={[0.06, 0.015, 4, 8, Math.PI]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.2, 0]} castShadow>
        {outfit}
        <boxGeometry args={[0.38, 0.55, 0.22]} />
      </mesh>
      {/* Left Arm (idle) */}
      <mesh position={[0.27, 1.28, 0]} castShadow>
        {outfit}
        <boxGeometry args={[0.12, 0.48, 0.12]} />
      </mesh>
      {/* Right Arm (waving) */}
      <mesh ref={waveRef} position={[-0.27, 1.28, 0]} castShadow>
        <boxGeometry args={[0.12, 0.48, 0.12]} />
        {outfit}
      </mesh>
      {/* Legs */}
      <mesh position={[0.11, 0.72, 0]} castShadow>
        <boxGeometry args={[0.14, 0.46, 0.14]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>
      <mesh position={[-0.11, 0.72, 0]} castShadow>
        <boxGeometry args={[0.14, 0.46, 0.14]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>
      {/* Feet */}
      <mesh position={[0.11, 0.47, 0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.11, 0.47, 0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Glow halo around guide */}
      <pointLight
        color={accentColor}
        intensity={isNearby ? 4 : 1.5}
        distance={4}
        position={[0, 1.5, 0]}
      />

      {/* Name tag — always visible */}
      <Html position={[0, 2.2, 0]} center distanceFactor={10}>
        <div
          style={{ color: accentColor, borderColor: accentColor + '66' }}
          className="whitespace-nowrap rounded-full border bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest backdrop-blur"
        >
          {name}
        </div>
      </Html>

      {/* Speech bubble — appears when nearby */}
      {isNearby && bubble && (
        <Html position={[0, 2.6, 0]} center distanceFactor={6}>
          <div
            style={{ borderColor: accentColor + '99', maxWidth: 220 }}
            className="relative rounded-2xl border-2 bg-black/90 px-4 py-3 text-[12px] leading-snug text-white shadow-2xl backdrop-blur"
          >
            {/* tail */}
            <div
              style={{ borderTopColor: accentColor + '99' }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 border-8 border-transparent"
            />
            <span
              style={{ color: accentColor }}
              className="mb-1 block text-[10px] font-black uppercase tracking-widest"
            >
              💬 {name}
            </span>
            {bubble}
            {charIdx.current < hintText.length && <span className="ml-0.5 animate-pulse">▋</span>}
          </div>
        </Html>
      )}

      {/* "Press E" label when first approaching */}
      {isNearby && !bubble && (
        <Html position={[0, 2.5, 0]} center distanceFactor={8}>
          <div
            style={{ borderColor: accentColor + '88', color: accentColor }}
            className="whitespace-nowrap rounded-full border bg-black/80 px-3 py-1 text-[11px] font-black uppercase tracking-widest backdrop-blur"
          >
            <kbd className="mr-1 rounded border border-current px-1 py-0.5 text-[10px] opacity-80">
              E
            </kbd>
            Talk to {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Terminal Keeper NPC ──────────────────────────────────────────────────────
// Stands at the terminal, beckons the player, shows "I have a challenge for you"

function TerminalKeeper({
  position,
  playerPos,
  isNearby,
  completed,
  challengeTitle,
  skinColor,
  outfitColor,
  accentColor,
}: {
  position: [number, number, number];
  playerPos: THREE.Vector3;
  isNearby: boolean;
  completed: boolean;
  challengeTitle?: string;
  skinColor: string;
  outfitColor: string;
  accentColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beckRef = useRef<THREE.Mesh>(null);

  const speech = completed
    ? 'Well done, traveller! The gate is open — you may pass.'
    : challengeTitle
      ? `I have a challenge for you: "${challengeTitle}". Solve it and the gate will open!`
      : 'Come, approach the terminal. A coding challenge awaits!';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const dx = playerPos.x - position[0];
    const dz = playerPos.z - position[2];
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      Math.atan2(dx, dz),
      0.06,
    );
    if (beckRef.current) {
      beckRef.current.rotation.x = isNearby
        ? -0.8 + Math.sin(clock.elapsedTime * 3) * 0.5
        : Math.sin(clock.elapsedTime * 1.5) * 0.06;
    }
  });

  const skin = <meshStandardMaterial color={skinColor} roughness={0.7} />;
  const outfit = (
    <meshStandardMaterial
      color={outfitColor}
      emissive={outfitColor}
      emissiveIntensity={0.25}
      roughness={0.4}
      metalness={0.3}
    />
  );

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 1.72, 0]} castShadow>
        {skin}
        <sphereGeometry args={[0.22, 10, 8]} />
      </mesh>
      <mesh position={[0.08, 1.77, 0.19]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.08, 1.77, 0.19]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Glasses */}
      <mesh position={[0.09, 1.78, 0.21]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.05, 0.01, 4, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
      <mesh position={[-0.09, 1.78, 0.21]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.05, 0.01, 4, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        {outfit}
        <boxGeometry args={[0.38, 0.55, 0.22]} />
      </mesh>
      {/* Left arm idle */}
      <mesh position={[0.27, 1.28, 0]} castShadow>
        {outfit}
        <boxGeometry args={[0.12, 0.48, 0.12]} />
      </mesh>
      {/* Right arm beckoning */}
      <mesh ref={beckRef} position={[-0.27, 1.28, 0]} castShadow>
        <boxGeometry args={[0.12, 0.48, 0.12]} />
        {outfit}
      </mesh>
      <mesh position={[0.11, 0.72, 0]} castShadow>
        <boxGeometry args={[0.14, 0.46, 0.14]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>
      <mesh position={[-0.11, 0.72, 0]} castShadow>
        <boxGeometry args={[0.14, 0.46, 0.14]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>
      <mesh position={[0.11, 0.47, 0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#0f0f0f" />
      </mesh>
      <mesh position={[-0.11, 0.47, 0.06]}>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#0f0f0f" />
      </mesh>

      <pointLight
        color={accentColor}
        intensity={isNearby ? 5 : 2}
        distance={4}
        position={[0, 1.5, 0]}
      />

      <Html position={[0, 2.2, 0]} center distanceFactor={10}>
        <div
          style={{ color: accentColor, borderColor: accentColor + '66' }}
          className="whitespace-nowrap rounded-full border bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest backdrop-blur"
        >
          {completed ? '✓ Guide' : '⚙ Keeper'}
        </div>
      </Html>

      {isNearby && (
        <Html position={[0, 2.65, 0]} center distanceFactor={5}>
          <div
            style={{ borderColor: accentColor + '99', maxWidth: 240 }}
            className="rounded-2xl border-2 bg-black/90 px-4 py-3 text-[12px] leading-snug text-white shadow-2xl backdrop-blur"
          >
            <span
              style={{ color: accentColor }}
              className="mb-1 block text-[10px] font-black uppercase tracking-widest"
            >
              ⚙ Terminal Keeper
            </span>
            {speech}
            <div className="mt-3">
              <span
                style={{ borderColor: accentColor + '88', color: accentColor }}
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase"
              >
                E · {completed ? 'Replay' : 'Start challenge'}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Shared scene helpers ─────────────────────────────────────────────────────

function PulsingLight({
  position,
  color,
  baseIntensity,
  speed = 1.5,
}: {
  position: [number, number, number];
  color: string;
  baseIntensity: number;
  speed?: number;
}) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.intensity =
        baseIntensity + Math.sin(clock.elapsedTime * speed) * baseIntensity * 0.4;
  });
  return <pointLight ref={ref} position={position} color={color} distance={12} />;
}

function RotatingGear({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.elapsedTime * 0.4;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.55, 0.12, 8, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        metalness={0.9}
        roughness={0.2}
      />
    </mesh>
  );
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
    const hint = (level.description ?? '') + ' ' + (level.title ?? '');
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
      .then((r) => setSceneState(r.state))
      .catch(() => undefined);
  }, [level.id]);
  useEffect(() => {
    const t = window.setInterval(() => {
      void sceneApi.save(level.id, sceneState).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(t);
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
      else if (nearby === 'door') onDoor();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearby, onChallenge, onClue, onDoor]);

  // Non-nullable lookups — the fallback keys always exist in these records
  const npcPos = (NPC_POS[chamberType] ?? NPC_POS['forest'])!;
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
    () => CHAMBER_ENVS[chamberType] ?? CHAMBER_ENVS['forest']!,
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
              onChange={(e) => setQuality(e.target.value as typeof quality)}
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

// ─── Chamber environments (lights + geometry, no NPCs) ────────────────────────

function ForestEnv({
  completed,
  doorPos,
}: {
  completed: boolean;
  doorPos: [number, number, number];
}) {
  return (
    <>
      <color attach="background" args={['#030f09']} />
      <fog attach="fog" args={['#030f09', 14, 30]} />
      <ambientLight intensity={0.35} color="#7fffd4" />
      <directionalLight
        castShadow
        position={[5, 10, 4]}
        intensity={1.4}
        color="#b0ffe0"
        shadow-mapSize={[2048, 2048]}
      />
      <PulsingLight position={[0, 3, -3]} color="#00ff88" baseIntensity={5} />
      <PulsingLight position={[-4, 1.5, 1]} color="#00cc66" baseIntensity={3} speed={2.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0a2e1a" roughness={0.98} />
      </mesh>
      <mesh position={[0, 2.5, -8]}>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0d2b1f" />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0d2b1f" />
        </mesh>
      ))}
      {(
        [
          [-5, 0, -5],
          [4, 0, -6],
          [-6, 0, 2],
          [5, 0, 3],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <mesh key={i} position={[x, 1.5, z]} castShadow>
          <cylinderGeometry args={[0.28, 0.38, 3.5, 8]} />
          <meshStandardMaterial color="#1a3d28" />
        </mesh>
      ))}
      {(
        [
          [-3, 0, 2],
          [3, 0, -1],
          [-1, 0, -4],
          [6, 0, -2],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <Float key={i} speed={1.4} rotationIntensity={0.1} floatIntensity={0.3}>
          <mesh position={[x, 0.3, z]}>
            <sphereGeometry args={[0.22, 8, 5]} />
            <meshStandardMaterial color="#00ff77" emissive="#00ff77" emissiveIntensity={2.5} />
          </mesh>
        </Float>
      ))}
      <mesh position={doorPos} castShadow>
        <boxGeometry args={[3.2, 3.6, 0.25]} />
        <meshStandardMaterial
          color={completed ? '#34d399' : '#6b4226'}
          emissive={completed ? '#065f46' : '#1a0a06'}
          emissiveIntensity={completed ? 1.8 : 0.3}
          metalness={0.4}
        />
      </mesh>
      <Html position={[0, 3.9, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold border ${completed ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-300' : 'bg-black/80 border-amber-500/30 text-amber-300'}`}
        >
          {completed ? '✓ GATE OPEN' : '⚿ SEALED GATE'}
        </span>
      </Html>
      <Sparkles
        count={100}
        scale={[18, 6, 14]}
        size={1.8}
        speed={0.2}
        color="#55ffbb"
        opacity={0.6}
      />
      <Stars radius={40} depth={20} count={800} factor={3} fade />
    </>
  );
}

function CyberEnv({
  completed,
  doorPos,
}: {
  completed: boolean;
  doorPos: [number, number, number];
}) {
  return (
    <>
      <color attach="background" args={['#050010']} />
      <fog attach="fog" args={['#050010', 14, 30]} />
      <ambientLight intensity={0.2} color="#7b2fff" />
      <directionalLight
        castShadow
        position={[-4, 8, 5]}
        intensity={1.4}
        color="#c084fc"
        shadow-mapSize={[2048, 2048]}
      />
      <PulsingLight position={[0, 2.5, -3]} color="#7c3aed" baseIntensity={7} />
      <PulsingLight position={[4, 1, 2]} color="#06b6d4" baseIntensity={4} speed={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0a0218" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 2.5, -8]}>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0d0530" metalness={0.5} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0d0530" metalness={0.5} />
        </mesh>
      ))}
      {(
        [
          [-5, 0, -4],
          [5, 0, -4],
          [-5, 0, 2],
          [5, 0, 2],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <mesh key={i} position={[x, 2, z]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 4, 6]} />
          <meshStandardMaterial
            color="#4f46e5"
            emissive="#4f46e5"
            emissiveIntensity={0.8}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      <RotatingGear position={[-3, 2, -5]} color="#06b6d4" />
      <RotatingGear position={[3, 1.5, -4.5]} color="#a855f7" />
      <mesh position={doorPos} castShadow>
        <boxGeometry args={[3.2, 3.6, 0.2]} />
        <meshStandardMaterial
          color={completed ? '#06b6d4' : '#3b0764'}
          emissive={completed ? '#0e4f6b' : '#1e0440'}
          emissiveIntensity={completed ? 2 : 0.4}
          metalness={0.7}
        />
      </mesh>
      <Html position={[0, 3.9, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold border ${completed ? 'bg-cyan-950/90 border-cyan-400/50 text-cyan-300' : 'bg-black/80 border-purple-500/40 text-purple-300'}`}
        >
          {completed ? '✓ PORTAL OPEN' : '⚿ PORTAL LOCKED'}
        </span>
      </Html>
      <Sparkles
        count={100}
        scale={[18, 6, 14]}
        size={2.2}
        speed={0.4}
        color="#a78bfa"
        opacity={0.6}
      />
    </>
  );
}

function IceEnv({ completed, doorPos }: { completed: boolean; doorPos: [number, number, number] }) {
  return (
    <>
      <color attach="background" args={['#020c1b']} />
      <fog attach="fog" args={['#020c1b', 12, 26]} />
      <ambientLight intensity={0.5} color="#bfdbfe" />
      <directionalLight
        castShadow
        position={[3, 10, 5]}
        intensity={1.8}
        color="#e0f2fe"
        shadow-mapSize={[2048, 2048]}
      />
      <PulsingLight position={[-2, 3, -3]} color="#38bdf8" baseIntensity={7} speed={0.8} />
      <PulsingLight position={[3, 2, 0]} color="#0ea5e9" baseIntensity={4} speed={1.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0c1a2e" roughness={0.1} metalness={0.6} />
      </mesh>
      <mesh position={[0, 2.5, -8]}>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0f2440" roughness={0.2} metalness={0.5} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0f2440" />
        </mesh>
      ))}
      {(
        [
          [-4, 0, -3],
          [4, 0, -5],
          [-6, 0, 1],
          [3, 0, 2],
          [-2, 0, -6],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.9, z]} castShadow>
          <coneGeometry args={[0.2 + i * 0.04, 1.8 + i * 0.3, 6]} />
          <meshStandardMaterial
            color="#93c5fd"
            emissive="#1d4ed8"
            emissiveIntensity={0.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <mesh position={doorPos} castShadow>
        <boxGeometry args={[3.2, 3.6, 0.22]} />
        <meshStandardMaterial
          color={completed ? '#7dd3fc' : '#1e3a5f'}
          emissive={completed ? '#0c4a6e' : '#050e1c'}
          emissiveIntensity={completed ? 2 : 0.3}
          roughness={0.1}
          metalness={0.7}
          transparent
          opacity={0.92}
        />
      </mesh>
      <Html position={[0, 3.9, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold border ${completed ? 'bg-sky-950/90 border-sky-400/50 text-sky-200' : 'bg-black/80 border-blue-500/40 text-blue-300'}`}
        >
          {completed ? '✓ PASSAGE OPEN' : '⚿ FROZEN GATE'}
        </span>
      </Html>
      <Sparkles
        count={60}
        scale={[18, 6, 14]}
        size={1.5}
        speed={0.15}
        color="#bae6fd"
        opacity={0.5}
      />
      <Stars radius={30} depth={10} count={1200} factor={4} fade />
    </>
  );
}

function LavaEnv({
  completed,
  doorPos,
}: {
  completed: boolean;
  doorPos: [number, number, number];
}) {
  return (
    <>
      <color attach="background" args={['#120302']} />
      <fog attach="fog" args={['#120302', 10, 24]} />
      <ambientLight intensity={0.25} color="#ff5500" />
      <directionalLight
        castShadow
        position={[2, 9, 4]}
        intensity={1.5}
        color="#ff8844"
        shadow-mapSize={[2048, 2048]}
      />
      <PulsingLight position={[0, 0.5, -2]} color="#ff4400" baseIntensity={10} speed={2.5} />
      <PulsingLight position={[-3, 1, 1]} color="#ff6600" baseIntensity={5} speed={1.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#1c0803" roughness={0.95} />
      </mesh>
      {(
        [
          [-2, 0, -1],
          [2, 0, 1],
          [-4, 0, -3],
          [1, 0, -4],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i * 0.5]} position={[x, 0.01, z]}>
          <planeGeometry args={[0.12, 1.5 + i * 0.3]} />
          <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={3} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, -8]}>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#2a0c04" roughness={0.95} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#2a0c04" />
        </mesh>
      ))}
      {(
        [
          [-5, 0, -4],
          [5, 0, -4],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <mesh key={i} position={[x, 2, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 4, 8]} />
          <meshStandardMaterial color="#4a1505" emissive="#8b1a06" emissiveIntensity={0.6} />
        </mesh>
      ))}
      <RotatingGear position={[-5, 3.5, -4]} color="#f97316" />
      <RotatingGear position={[5, 3.5, -4]} color="#dc2626" />
      <mesh position={doorPos} castShadow>
        <boxGeometry args={[3.2, 3.6, 0.3]} />
        <meshStandardMaterial
          color={completed ? '#fb923c' : '#450a03'}
          emissive={completed ? '#9a3412' : '#1c0401'}
          emissiveIntensity={completed ? 2.2 : 0.4}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, 3.9, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold border ${completed ? 'bg-orange-950/90 border-orange-400/50 text-orange-300' : 'bg-black/80 border-red-600/40 text-red-300'}`}
        >
          {completed ? '✓ FORGE GATE OPEN' : '⚿ IRON GATE'}
        </span>
      </Html>
      <Sparkles
        count={80}
        scale={[18, 4, 14]}
        size={2.5}
        speed={0.6}
        color="#ff6600"
        opacity={0.5}
      />
    </>
  );
}

function SpaceEnv({
  completed,
  doorPos,
}: {
  completed: boolean;
  doorPos: [number, number, number];
}) {
  return (
    <>
      <color attach="background" args={['#000208']} />
      <ambientLight intensity={0.15} color="#60a5fa" />
      <directionalLight
        castShadow
        position={[0, 12, 3]}
        intensity={1.2}
        color="#a5f3fc"
        shadow-mapSize={[2048, 2048]}
      />
      <PulsingLight position={[0, 3, -2]} color="#818cf8" baseIntensity={9} speed={1.1} />
      <PulsingLight position={[-4, 2, 0]} color="#34d399" baseIntensity={3} speed={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#060d1f" roughness={0.4} metalness={0.8} />
      </mesh>
      {[-6, -3, 0, 3, 6].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
          <planeGeometry args={[0.05, 18]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#1d4ed8" emissiveIntensity={1.5} />
        </mesh>
      ))}
      {[-7, -3.5, 0, 3.5, 7].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, z]}>
          <planeGeometry args={[0.05, 22]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#1d4ed8" emissiveIntensity={1.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, -8]}>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0a1628" metalness={0.8} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0a1628" />
        </mesh>
      ))}
      {(
        [
          [-3, 2.5, -4],
          [4, 3, -5],
          [-5, 1.8, -2],
          [2, 2.2, 1],
        ] as [number, number, number][]
      ).map(([x, y, z], i) => (
        <Float key={i} speed={0.6 + i * 0.2} rotationIntensity={0.5} floatIntensity={0.6}>
          <mesh position={[x, y, z]} castShadow>
            <dodecahedronGeometry args={[0.28 + i * 0.06, 0]} />
            <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.3} />
          </mesh>
        </Float>
      ))}
      <mesh position={doorPos} castShadow>
        <boxGeometry args={[3.2, 3.6, 0.18]} />
        <meshStandardMaterial
          color={completed ? '#818cf8' : '#1e1b4b'}
          emissive={completed ? '#3730a3' : '#0f0c29'}
          emissiveIntensity={completed ? 2.5 : 0.4}
          metalness={0.9}
          roughness={0.05}
          transparent
          opacity={0.95}
        />
      </mesh>
      <Html position={[0, 3.9, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold border ${completed ? 'bg-indigo-950/90 border-indigo-400/50 text-indigo-200' : 'bg-black/80 border-blue-600/40 text-blue-300'}`}
        >
          {completed ? '✓ AIRLOCK OPEN' : '⚿ AIRLOCK SEALED'}
        </span>
      </Html>
      <Sparkles
        count={200}
        scale={[20, 8, 16]}
        size={1.2}
        speed={0.1}
        color="#818cf8"
        opacity={0.4}
      />
      <Stars radius={60} depth={30} count={3000} factor={5} fade speed={0.5} />
    </>
  );
}

const CHAMBER_ENVS: Record<
  string,
  React.FC<{ completed: boolean; doorPos: [number, number, number] }>
> = {
  forest: ForestEnv,
  cyber: CyberEnv,
  ice: IceEnv,
  lava: LavaEnv,
  space: SpaceEnv,
};
