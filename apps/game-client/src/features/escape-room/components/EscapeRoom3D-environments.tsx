/**
 * Chamber environment components for the 3D escape room scene.
 *
 * Each environment provides the lighting, floor, walls, and decorative geometry
 * for one biome. None of them contain NPCs or player logic.
 *
 * Exports:
 *   ForestEnv   – bioluminescent jungle
 *   CyberEnv    – neon cyber-lab
 *   IceEnv      – frozen arctic ruins
 *   LavaEnv     – industrial lava forge
 *   SpaceEnv    – deep-space station
 *   CHAMBER_ENVS – lookup map used by EscapeRoom3D
 */

import type React from 'react';
import { Html, Sparkles, Float, Stars } from '@react-three/drei';
import { PulsingLight, RotatingGear } from './EscapeRoom3D-helpers';

// ─── Forest ───────────────────────────────────────────────────────────────────

export function ForestEnv({
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

// ─── Cyber ────────────────────────────────────────────────────────────────────

export function CyberEnv({
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

// ─── Ice ──────────────────────────────────────────────────────────────────────

export function IceEnv({
  completed,
  doorPos,
}: {
  completed: boolean;
  doorPos: [number, number, number];
}) {
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

// ─── Lava ─────────────────────────────────────────────────────────────────────

export function LavaEnv({
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

// ─── Space ────────────────────────────────────────────────────────────────────

export function SpaceEnv({
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

// ─── Lookup map ───────────────────────────────────────────────────────────────

export const CHAMBER_ENVS: Record<
  string,
  React.FC<{ completed: boolean; doorPos: [number, number, number] }>
> = {
  forest: ForestEnv,
  cyber: CyberEnv,
  ice: IceEnv,
  lava: LavaEnv,
  space: SpaceEnv,
};
