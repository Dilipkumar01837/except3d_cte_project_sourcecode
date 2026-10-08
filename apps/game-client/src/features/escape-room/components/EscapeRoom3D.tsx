import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles, Float, Stars } from '@react-three/drei';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { WorldLevel } from '@/features/worlds/lib/world-api';
import { sceneApi, type SceneState } from '../lib/scene-api';

// ─── Shared animated components ────────────────────────────────────────────

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
    if (ref.current) {
      ref.current.intensity =
        baseIntensity + Math.sin(clock.elapsedTime * speed) * baseIntensity * 0.4;
    }
  });
  return <pointLight ref={ref} position={position} color={color} distance={12} />;
}

function FloatingCrystal({
  position,
  color,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2) * 0.18;
      ref.current.rotation.y = clock.elapsedTime * 0.6;
    }
  });
  return (
    <mesh ref={ref} position={position} castShadow onClick={onClick}>
      <octahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.8}
        roughness={0.1}
        metalness={0.6}
      />
    </mesh>
  );
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

// ─── Chamber 1: Python Forest (emerald jungle, bioluminescent) ──────────────
function ForestChamber({
  completed,
  onTerminal,
  onDoor,
}: {
  completed: boolean;
  onTerminal: () => void;
  onDoor: () => void;
}) {
  return (
    <>
      <color attach="background" args={['#030f09']} />
      <fog attach="fog" args={['#030f09', 12, 28]} />
      <ambientLight intensity={0.3} color="#7fffd4" />
      <directionalLight
        castShadow
        position={[5, 10, 4]}
        intensity={1.6}
        color="#b0ffe0"
        shadow-mapSize={[2048, 2048]}
      />
      <PulsingLight position={[0, 3, -3]} color="#00ff88" baseIntensity={6} />
      <PulsingLight position={[-4, 1.5, 1]} color="#00cc66" baseIntensity={3} speed={2.1} />
      {/* Floor — mossy stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0a2e1a" roughness={0.98} />
      </mesh>
      {/* Back wall with vines */}
      <mesh position={[0, 2.5, -8]} receiveShadow>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0d2b1f" roughness={0.9} />
      </mesh>
      {/* Side walls */}
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0d2b1f" />
        </mesh>
      ))}
      {/* Tree trunks */}
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
          <meshStandardMaterial color="#1a3d28" roughness={0.9} />
        </mesh>
      ))}
      {/* Glowing mushrooms as ambient decorations */}
      {(
        [
          [-3, 0, 2],
          [3, 0, -1],
          [-1, 0, -4],
          [6, 0, -2],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <Float key={i} speed={1.4} rotationIntensity={0.1} floatIntensity={0.3}>
          <mesh position={[x, 0.3, z]} castShadow>
            <sphereGeometry args={[0.22, 8, 5]} />
            <meshStandardMaterial color="#00ff77" emissive="#00ff77" emissiveIntensity={2.5} />
          </mesh>
        </Float>
      ))}
      {/* Terminal */}
      <FloatingCrystal position={[0, 1.5, -2.5]} color="#00ffa0" onClick={onTerminal} />
      <Html position={[0, 2.5, -2.5]} center>
        <span className="rounded bg-emerald-950/90 border border-emerald-400/40 px-2 py-1 text-xs font-bold text-emerald-300 shadow-lg">
          TERMINAL
        </span>
      </Html>
      {/* Gate */}
      <mesh position={[0, 1.8, -7.5]} castShadow onClick={onDoor}>
        <boxGeometry args={[3.2, 3.6, 0.25]} />
        <meshStandardMaterial
          color={completed ? '#34d399' : '#6b4226'}
          emissive={completed ? '#065f46' : '#1a0a06'}
          emissiveIntensity={completed ? 1.8 : 0.3}
          metalness={0.4}
        />
      </mesh>
      <Html position={[0, 3.8, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold shadow-lg border ${completed ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-300' : 'bg-black/80 border-amber-500/30 text-amber-300'}`}
        >
          {completed ? '✓ GATE OPEN' : '⚿ SEALED GATE'}
        </span>
      </Html>
      <Sparkles
        count={120}
        scale={[18, 6, 14]}
        size={1.8}
        speed={0.2}
        color="#55ffbb"
        opacity={0.7}
      />
      <Stars radius={40} depth={20} count={800} factor={3} fade />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={13}
        target={[0, 1.2, -2]}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.65}
      />
    </>
  );
}

// ─── Chamber 2: JavaScript Jungle (neon cyan + purple holographic lab) ──────
function CyberLabChamber({
  completed,
  onTerminal,
  onDoor,
}: {
  completed: boolean;
  onTerminal: () => void;
  onDoor: () => void;
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
      <PulsingLight position={[0, 2.5, -3]} color="#7c3aed" baseIntensity={8} />
      <PulsingLight position={[4, 1, 2]} color="#06b6d4" baseIntensity={4} speed={1.8} />
      {/* Metallic floor with grid lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0a0218" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, 2.5, -8]} receiveShadow>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0d0530" metalness={0.5} roughness={0.4} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0d0530" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Holographic pillars */}
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
            metalness={0.8}
            roughness={0.1}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
      {/* Rotating gears */}
      <RotatingGear position={[-3, 2, -5]} color="#06b6d4" />
      <RotatingGear position={[3, 1.5, -4.5]} color="#a855f7" />
      {/* Terminal — floating console */}
      <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>
        <mesh position={[0, 1.4, -2.5]} castShadow onClick={onTerminal}>
          <boxGeometry args={[1.6, 1.0, 0.15]} />
          <meshStandardMaterial
            color="#0891b2"
            emissive="#0e7490"
            emissiveIntensity={2.5}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>
      </Float>
      <Html position={[0, 2.2, -2.5]} center>
        <span className="rounded bg-cyan-950/90 border border-cyan-400/50 px-2 py-1 text-xs font-bold text-cyan-300 shadow-lg">
          CONSOLE
        </span>
      </Html>
      {/* Gate */}
      <mesh position={[0, 1.8, -7.5]} castShadow onClick={onDoor}>
        <boxGeometry args={[3.2, 3.6, 0.2]} />
        <meshStandardMaterial
          color={completed ? '#06b6d4' : '#3b0764'}
          emissive={completed ? '#0e4f6b' : '#1e0440'}
          emissiveIntensity={completed ? 2 : 0.4}
          metalness={0.7}
        />
      </mesh>
      <Html position={[0, 3.8, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold shadow-lg border ${completed ? 'bg-cyan-950/90 border-cyan-400/50 text-cyan-300' : 'bg-black/80 border-purple-500/40 text-purple-300'}`}
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
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={13}
        target={[0, 1.2, -2]}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.65}
      />
    </>
  );
}

// ─── Chamber 3: TypeScript Tundra (icy blue, frozen ruins) ──────────────────
function IceCaveChamber({
  completed,
  onTerminal,
  onDoor,
}: {
  completed: boolean;
  onTerminal: () => void;
  onDoor: () => void;
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
      {/* Icy floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0c1a2e" roughness={0.1} metalness={0.6} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, 2.5, -8]} receiveShadow>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0f2440" roughness={0.2} metalness={0.5} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0f2440" roughness={0.2} metalness={0.5} />
        </mesh>
      ))}
      {/* Ice stalagmites */}
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
            roughness={0.05}
            metalness={0.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      {/* Terminal — frozen crystal terminal */}
      <FloatingCrystal position={[0, 1.5, -2.5]} color="#38bdf8" onClick={onTerminal} />
      <Html position={[0, 2.5, -2.5]} center>
        <span className="rounded bg-sky-950/90 border border-sky-400/50 px-2 py-1 text-xs font-bold text-sky-200 shadow-lg">
          RUNE STONE
        </span>
      </Html>
      {/* Gate */}
      <mesh position={[0, 1.8, -7.5]} castShadow onClick={onDoor}>
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
      <Html position={[0, 3.8, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold shadow-lg border ${completed ? 'bg-sky-950/90 border-sky-400/50 text-sky-200' : 'bg-black/80 border-blue-500/40 text-blue-300'}`}
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
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={13}
        target={[0, 1.2, -2]}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.65}
      />
    </>
  );
}

// ─── Chamber 4: Rust Realm (industrial lava forge) ──────────────────────────
function LavaChamber({
  completed,
  onTerminal,
  onDoor,
}: {
  completed: boolean;
  onTerminal: () => void;
  onDoor: () => void;
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
      {/* Dark stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#1c0803" roughness={0.95} />
      </mesh>
      {/* Lava cracks in floor */}
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
      {/* Walls */}
      <mesh position={[0, 2.5, -8]} receiveShadow>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#2a0c04" roughness={0.95} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#2a0c04" roughness={0.95} />
        </mesh>
      ))}
      {/* Forge pillars */}
      {(
        [
          [-5, 0, -4],
          [5, 0, -4],
        ] as [number, number, number][]
      ).map(([x, , z], i) => (
        <mesh key={i} position={[x, 2, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 4, 8]} />
          <meshStandardMaterial
            color="#4a1505"
            emissive="#8b1a06"
            emissiveIntensity={0.6}
            roughness={0.8}
          />
        </mesh>
      ))}
      <RotatingGear position={[-5, 3.5, -4]} color="#f97316" />
      <RotatingGear position={[5, 3.5, -4]} color="#dc2626" />
      {/* Terminal */}
      <mesh position={[0, 1.2, -2.5]} castShadow onClick={onTerminal}>
        <boxGeometry args={[1.4, 0.9, 0.5]} />
        <meshStandardMaterial
          color="#7c2d12"
          emissive="#ea580c"
          emissiveIntensity={2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, 2.2, -2.5]} center>
        <span className="rounded bg-orange-950/90 border border-orange-400/50 px-2 py-1 text-xs font-bold text-orange-300 shadow-lg">
          FORGE TERMINAL
        </span>
      </Html>
      {/* Gate */}
      <mesh position={[0, 1.8, -7.5]} castShadow onClick={onDoor}>
        <boxGeometry args={[3.2, 3.6, 0.3]} />
        <meshStandardMaterial
          color={completed ? '#fb923c' : '#450a03'}
          emissive={completed ? '#9a3412' : '#1c0401'}
          emissiveIntensity={completed ? 2.2 : 0.4}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <Html position={[0, 3.8, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold shadow-lg border ${completed ? 'bg-orange-950/90 border-orange-400/50 text-orange-300' : 'bg-black/80 border-red-600/40 text-red-300'}`}
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
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={13}
        target={[0, 1.2, -2]}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.65}
      />
    </>
  );
}

// ─── Chamber 5: Go Galaxy (deep space station) ──────────────────────────────
function SpaceChamber({
  completed,
  onTerminal,
  onDoor,
}: {
  completed: boolean;
  onTerminal: () => void;
  onDoor: () => void;
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
      {/* Space station floor — dark metal grating */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#060d1f" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Glowing floor grid lines */}
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
      {/* Walls */}
      <mesh position={[0, 2.5, -8]} receiveShadow>
        <boxGeometry args={[22, 5, 0.3]} />
        <meshStandardMaterial color="#0a1628" metalness={0.8} roughness={0.3} />
      </mesh>
      {([-9, 9] as const).map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.3, 5, 18]} />
          <meshStandardMaterial color="#0a1628" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Floating space debris / asteroids */}
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
      {/* Terminal — holographic panel */}
      <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.3}>
        <mesh position={[0, 1.5, -2.5]} castShadow onClick={onTerminal}>
          <boxGeometry args={[1.8, 1.1, 0.06]} />
          <meshStandardMaterial
            color="#1e40af"
            emissive="#3b82f6"
            emissiveIntensity={3}
            metalness={0.9}
            roughness={0.05}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>
      <Html position={[0, 2.4, -2.5]} center>
        <span className="rounded bg-blue-950/90 border border-blue-400/50 px-2 py-1 text-xs font-bold text-blue-200 shadow-lg">
          NAV COMPUTER
        </span>
      </Html>
      {/* Gate */}
      <mesh position={[0, 1.8, -7.5]} castShadow onClick={onDoor}>
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
      <Html position={[0, 3.8, -7.3]} center>
        <span
          className={`rounded px-2 py-1 text-xs font-bold shadow-lg border ${completed ? 'bg-indigo-950/90 border-indigo-400/50 text-indigo-200' : 'bg-black/80 border-blue-600/40 text-blue-300'}`}
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
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={13}
        target={[0, 1.2, -2]}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.65}
      />
    </>
  );
}

// ─── World slug → chamber mapping ──────────────────────────────────────────
function selectChamber(worldSlug: string) {
  if (worldSlug.includes('javascript') || worldSlug.includes('js')) return 'cyber';
  if (worldSlug.includes('typescript') || worldSlug.includes('ts')) return 'ice';
  if (worldSlug.includes('rust') || worldSlug.includes('c++') || worldSlug.includes('cpp'))
    return 'lava';
  if (worldSlug.includes('go') || worldSlug.includes('galaxy')) return 'space';
  return 'forest'; // python-forest + fallback
}

// ─── Keyboard mover ──────────────────────────────────────────────────────────
function KeyboardMover({
  state,
  onSave,
}: {
  state: SceneState;
  onSave: (position: SceneState['playerPosition']) => void;
}) {
  const position = useRef(
    new THREE.Vector3(state.playerPosition.x, state.playerPosition.y, state.playerPosition.z),
  );
  const keys = useRef(new Set<string>());
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
  useFrame((_, delta) => {
    const dir = new THREE.Vector3(
      Number(keys.current.has('d')) - Number(keys.current.has('a')),
      0,
      Number(keys.current.has('s')) - Number(keys.current.has('w')),
    );
    if (dir.lengthSq() === 0) return;
    dir.normalize().multiplyScalar(Math.min(delta, 0.05) * 4);
    position.current.add(dir);
    position.current.x = THREE.MathUtils.clamp(position.current.x, -7, 7);
    position.current.z = THREE.MathUtils.clamp(position.current.z, -5.5, 5.5);
    onSave({ x: position.current.x, y: position.current.y, z: position.current.z });
  });
  return null;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function EscapeRoom3D({
  level,
  completed,
  onChallenge,
  onRefresh,
  onFallback,
}: {
  level: WorldLevel;
  completed: boolean;
  onChallenge: () => void;
  onRefresh: () => void;
  onFallback: () => void;
}) {
  const [sceneState, setSceneState] = useState<SceneState>({
    playerPosition: { x: 0, y: 1.6, z: 4 },
    unlockedObjects: [],
    sceneProgress: {},
  });
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  // Derive the world slug from the level so we can pick the right chamber.
  // WorldLevel carries worldId but not world slug — use a fallback heuristic
  // on the level title/description until the API exposes slug directly.
  const chamberType = useMemo(() => {
    const hint = (level.description ?? '') + ' ' + (level.title ?? '');
    return selectChamber(hint.toLowerCase());
  }, [level.description, level.title]);

  useEffect(() => {
    void sceneApi
      .load(level.id)
      .then((result) => {
        setSceneState(result.state);
      })
      .catch(() => undefined);
  }, [level.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void sceneApi.save(level.id, sceneState).catch(() => undefined);
    }, 5000);
    return () => {
      window.clearInterval(timer);
    };
  }, [level.id, sceneState]);

  const savePosition = (position: SceneState['playerPosition']) => {
    setSceneState((curr) => ({ ...curr, playerPosition: position }));
  };

  const chamberProps = {
    completed,
    onTerminal: onChallenge,
    onDoor: () => {
      if (completed) onRefresh();
    },
  };

  return (
    <section
      className="relative h-[min(74vh,700px)] overflow-hidden rounded-2xl border border-white/10"
      style={{
        background:
          chamberType === 'space'
            ? '#000208'
            : chamberType === 'lava'
              ? '#120302'
              : chamberType === 'ice'
                ? '#020c1b'
                : chamberType === 'cyber'
                  ? '#050010'
                  : '#030f09',
      }}
      aria-label="3D escape room"
    >
      <Canvas
        shadows
        dpr={quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]}
        camera={{ position: [0, 4, 8], fov: 52 }}
        fallback={
          <div className="grid h-full place-items-center text-sm text-slate-300">
            WebGL unavailable. Use 2D room.
          </div>
        }
      >
        {chamberType === 'cyber' && <CyberLabChamber {...chamberProps} />}
        {chamberType === 'ice' && <IceCaveChamber {...chamberProps} />}
        {chamberType === 'lava' && <LavaChamber {...chamberProps} />}
        {chamberType === 'space' && <SpaceChamber {...chamberProps} />}
        {chamberType === 'forest' && <ForestChamber {...chamberProps} />}
        <KeyboardMover state={sceneState} onSave={savePosition} />
      </Canvas>

      {/* HUD overlay */}
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
      <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-black/60 py-2 text-center text-xs text-slate-400 backdrop-blur">
        WASD to move · Drag to orbit · Click glowing object to interact
      </p>
    </section>
  );
}
