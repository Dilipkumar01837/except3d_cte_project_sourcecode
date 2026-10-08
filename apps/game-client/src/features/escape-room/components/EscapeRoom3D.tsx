import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles, Float, Stars } from '@react-three/drei';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { WorldLevel } from '@/features/worlds/lib/world-api';
import { sceneApi, type SceneState } from '../lib/scene-api';

// ─── Types ────────────────────────────────────────────────────────────────────

type NearbyObj = 'terminal' | 'clue' | 'door' | null;

interface InteractPoint {
  kind: NearbyObj;
  pos: THREE.Vector3;
}

// ─── Shared animated components ───────────────────────────────────────────────

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

/** Octahedron crystal that bobs and spins — used as the terminal marker. */
function FloatingCrystal({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2) * 0.18;
      ref.current.rotation.y = clock.elapsedTime * 0.8;
    }
  });
  return (
    <mesh ref={ref} position={position} castShadow>
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

/** Spinning torus gear decoration. */
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

/**
 * Visible player capsule.  Moves with WASD in 3D space, stays within the room
 * bounds, and reports its current world-space position every frame so the
 * parent can run proximity checks.
 */
function PlayerCapsule({
  color,
  onPositionChange,
}: {
  color: string;
  onPositionChange: (pos: THREE.Vector3) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const keys = useRef(new Set<string>());
  const pos = useRef(new THREE.Vector3(0, 0.9, 3.5));

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
    const clampedDelta = Math.min(delta, 0.05);
    const speed = 4.5;
    const dx =
      (Number(keys.current.has('d')) - Number(keys.current.has('a'))) * speed * clampedDelta;
    const dz =
      (Number(keys.current.has('s')) - Number(keys.current.has('w'))) * speed * clampedDelta;

    if (dx !== 0 || dz !== 0) {
      pos.current.x = THREE.MathUtils.clamp(pos.current.x + dx, -7.5, 7.5);
      pos.current.z = THREE.MathUtils.clamp(pos.current.z + dz, -6.5, 5.5);

      if (meshRef.current) {
        meshRef.current.position.copy(pos.current);
        // slight lean in direction of travel
        meshRef.current.rotation.z = -dx * 4;
        meshRef.current.rotation.x = -dz * 3;
      }
      onPositionChange(pos.current.clone());
    }

    // bob the player gently when still
    if (meshRef.current) {
      meshRef.current.position.y = pos.current.y + Math.sin(clock.elapsedTime * 2) * 0.06;
    }
    if (glowRef.current) {
      glowRef.current.position.copy(pos.current);
    }
  });

  return (
    <group>
      {/* Body */}
      <mesh ref={meshRef} position={pos.current.toArray()} castShadow>
        <capsuleGeometry args={[0.22, 0.55, 6, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      {/* Subtle player glow */}
      <pointLight
        ref={glowRef}
        position={pos.current.toArray()}
        color={color}
        intensity={2.5}
        distance={3}
      />
    </group>
  );
}

/** "Press E" prompt that floats above the nearest interactable in world-space. */
function ProximityLabel({
  position,
  label,
  color,
}: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <Html position={[position[0], position[1] + 1.1, position[2]]} center distanceFactor={8}>
      <div
        style={{ borderColor: color + '88', color }}
        className="whitespace-nowrap rounded-full border bg-black/80 px-3 py-1 text-[11px] font-black uppercase tracking-widest backdrop-blur"
      >
        <kbd className="mr-1 rounded border border-current px-1 py-0.5 text-[10px] opacity-80">
          E
        </kbd>
        {label}
      </div>
    </Html>
  );
}

// ─── Chamber 1: Python Forest ─────────────────────────────────────────────────

function ForestChamber({
  completed,
  playerPos,
  nearby,
}: {
  completed: boolean;
  playerPos: THREE.Vector3;
  nearby: NearbyObj;
}) {
  const TERMINAL_POS: [number, number, number] = [0, 1.5, -2.5];
  const CLUE_POS: [number, number, number] = [-3.5, 0.6, 0.5];
  const DOOR_POS: [number, number, number] = [0, 1.8, -7.4];

  // door swing when completed
  const doorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!doorRef.current) return;
    const target = completed ? Math.PI / 2.2 : 0;
    doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, target, 0.04);
  });

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

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0a2e1a" roughness={0.98} />
      </mesh>
      {/* Back wall */}
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
      {/* Glowing mushrooms */}
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

      {/* Clue: mossy stone */}
      <Float speed={0.8} floatIntensity={0.2}>
        <mesh position={CLUE_POS} castShadow>
          <boxGeometry args={[0.6, 0.3, 0.6]} />
          <meshStandardMaterial
            color="#2d6a4f"
            emissive="#1b4332"
            emissiveIntensity={0.6}
            roughness={0.8}
          />
        </mesh>
      </Float>
      {nearby === 'clue' && (
        <ProximityLabel position={CLUE_POS} label="Read clue" color="#86efac" />
      )}

      {/* Terminal crystal */}
      <FloatingCrystal position={TERMINAL_POS} color="#00ffa0" />
      {nearby === 'terminal' && (
        <ProximityLabel position={TERMINAL_POS} label="Terminal" color="#00ffa0" />
      )}

      {/* Door */}
      <mesh ref={doorRef} position={DOOR_POS} castShadow>
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
      {nearby === 'door' && (
        <ProximityLabel
          position={DOOR_POS}
          label={completed ? 'Escape' : 'Try gate'}
          color="#86efac"
        />
      )}

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

// ─── Chamber 2: JavaScript Jungle (cyber lab) ─────────────────────────────────

function CyberLabChamber({
  completed,
  playerPos,
  nearby,
}: {
  completed: boolean;
  playerPos: THREE.Vector3;
  nearby: NearbyObj;
}) {
  const TERMINAL_POS: [number, number, number] = [0, 1.4, -2.5];
  const CLUE_POS: [number, number, number] = [3.5, 0.8, 1];
  const DOOR_POS: [number, number, number] = [0, 1.8, -7.4];

  const doorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!doorRef.current) return;
    const target = completed ? Math.PI / 2.2 : 0;
    doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, target, 0.04);
  });

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

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 18]} />
        <meshStandardMaterial color="#0a0218" roughness={0.3} metalness={0.7} />
      </mesh>
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
      <RotatingGear position={[-3, 2, -5]} color="#06b6d4" />
      <RotatingGear position={[3, 1.5, -4.5]} color="#a855f7" />

      {/* Clue: data pad */}
      <Float speed={1.2} floatIntensity={0.25}>
        <mesh position={CLUE_POS} castShadow>
          <boxGeometry args={[0.5, 0.7, 0.06]} />
          <meshStandardMaterial
            color="#4f46e5"
            emissive="#6d28d9"
            emissiveIntensity={1.5}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>
      </Float>
      {nearby === 'clue' && (
        <ProximityLabel position={CLUE_POS} label="Read data pad" color="#a78bfa" />
      )}

      {/* Terminal: floating console */}
      <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>
        <mesh position={TERMINAL_POS} castShadow>
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
      {nearby === 'terminal' && (
        <ProximityLabel position={TERMINAL_POS} label="Console" color="#22d3ee" />
      )}

      <mesh ref={doorRef} position={DOOR_POS} castShadow>
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
      {nearby === 'door' && (
        <ProximityLabel
          position={DOOR_POS}
          label={completed ? 'Escape' : 'Try portal'}
          color="#a78bfa"
        />
      )}

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

// ─── Chamber 3: TypeScript Tundra ────────────────────────────────────────────

function IceCaveChamber({
  completed,
  playerPos,
  nearby,
}: {
  completed: boolean;
  playerPos: THREE.Vector3;
  nearby: NearbyObj;
}) {
  const TERMINAL_POS: [number, number, number] = [0, 1.5, -2.5];
  const CLUE_POS: [number, number, number] = [-4, 0.8, 1];
  const DOOR_POS: [number, number, number] = [0, 1.8, -7.4];

  const doorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!doorRef.current) return;
    const target = completed ? Math.PI / 2.2 : 0;
    doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, target, 0.04);
  });

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

      {/* Clue: ice tablet */}
      <Float speed={0.7} floatIntensity={0.2}>
        <mesh position={CLUE_POS} castShadow>
          <boxGeometry args={[0.55, 0.7, 0.08]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#0ea5e9"
            emissiveIntensity={1.2}
            roughness={0.05}
            metalness={0.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>
      {nearby === 'clue' && (
        <ProximityLabel position={CLUE_POS} label="Read tablet" color="#93c5fd" />
      )}

      {/* Terminal crystal */}
      <FloatingCrystal position={TERMINAL_POS} color="#38bdf8" />
      {nearby === 'terminal' && (
        <ProximityLabel position={TERMINAL_POS} label="Rune stone" color="#38bdf8" />
      )}

      <mesh ref={doorRef} position={DOOR_POS} castShadow>
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
      {nearby === 'door' && (
        <ProximityLabel
          position={DOOR_POS}
          label={completed ? 'Escape' : 'Try passage'}
          color="#93c5fd"
        />
      )}

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

// ─── Chamber 4: Rust Realm (lava forge) ──────────────────────────────────────

function LavaChamber({
  completed,
  playerPos,
  nearby,
}: {
  completed: boolean;
  playerPos: THREE.Vector3;
  nearby: NearbyObj;
}) {
  const TERMINAL_POS: [number, number, number] = [0, 1.2, -2.5];
  const CLUE_POS: [number, number, number] = [3, 0.6, 1];
  const DOOR_POS: [number, number, number] = [0, 1.8, -7.4];

  const doorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!doorRef.current) return;
    const target = completed ? Math.PI / 2.2 : 0;
    doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, target, 0.04);
  });

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
      {/* Lava cracks */}
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

      {/* Clue: ownership rune */}
      <Float speed={0.9} floatIntensity={0.2}>
        <mesh position={CLUE_POS} castShadow>
          <tetrahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ea580c"
            emissiveIntensity={1.8}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      </Float>
      {nearby === 'clue' && (
        <ProximityLabel position={CLUE_POS} label="Read rune" color="#fb923c" />
      )}

      {/* Terminal: forge console */}
      <mesh position={TERMINAL_POS} castShadow>
        <boxGeometry args={[1.4, 0.9, 0.5]} />
        <meshStandardMaterial
          color="#7c2d12"
          emissive="#ea580c"
          emissiveIntensity={2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {nearby === 'terminal' && (
        <ProximityLabel position={TERMINAL_POS} label="Forge terminal" color="#fb923c" />
      )}

      <mesh ref={doorRef} position={DOOR_POS} castShadow>
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
      {nearby === 'door' && (
        <ProximityLabel
          position={DOOR_POS}
          label={completed ? 'Escape' : 'Try gate'}
          color="#fb923c"
        />
      )}

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

// ─── Chamber 5: Go Galaxy ─────────────────────────────────────────────────────

function SpaceChamber({
  completed,
  playerPos,
  nearby,
}: {
  completed: boolean;
  playerPos: THREE.Vector3;
  nearby: NearbyObj;
}) {
  const TERMINAL_POS: [number, number, number] = [0, 1.5, -2.5];
  const CLUE_POS: [number, number, number] = [-3.5, 1, 1];
  const DOOR_POS: [number, number, number] = [0, 1.8, -7.4];

  const doorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!doorRef.current) return;
    const target = completed ? Math.PI / 2.2 : 0;
    doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, target, 0.04);
  });

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
      {/* Floor grid */}
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
      {/* Floating asteroids */}
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

      {/* Clue: signal array */}
      <Float speed={1} floatIntensity={0.3}>
        <mesh position={CLUE_POS} castShadow>
          <octahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#059669"
            emissiveIntensity={2}
            metalness={0.6}
            roughness={0.1}
          />
        </mesh>
      </Float>
      {nearby === 'clue' && (
        <ProximityLabel position={CLUE_POS} label="Signal array" color="#34d399" />
      )}

      {/* Terminal: holographic panel */}
      <Float speed={1.5} rotationIntensity={0.08} floatIntensity={0.3}>
        <mesh position={TERMINAL_POS} castShadow>
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
      {nearby === 'terminal' && (
        <ProximityLabel position={TERMINAL_POS} label="Nav computer" color="#818cf8" />
      )}

      <mesh ref={doorRef} position={DOOR_POS} castShadow>
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
      {nearby === 'door' && (
        <ProximityLabel
          position={DOOR_POS}
          label={completed ? 'Escape' : 'Try airlock'}
          color="#818cf8"
        />
      )}

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

// ─── World slug → chamber type ────────────────────────────────────────────────

function selectChamber(hint: string): 'forest' | 'cyber' | 'ice' | 'lava' | 'space' {
  if (hint.includes('javascript') || hint.includes('js')) return 'cyber';
  if (hint.includes('typescript') || hint.includes('ts')) return 'ice';
  if (hint.includes('rust') || hint.includes('c++') || hint.includes('cpp')) return 'lava';
  if (hint.includes('go') || hint.includes('galaxy')) return 'space';
  return 'forest';
}

// Interact points per chamber type (must match positions above)
const INTERACT_POINTS: Record<string, InteractPoint[]> = {
  forest: [
    { kind: 'clue', pos: new THREE.Vector3(-3.5, 0.6, 0.5) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 1.5, -2.5) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  cyber: [
    { kind: 'clue', pos: new THREE.Vector3(3.5, 0.8, 1) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 1.4, -2.5) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  ice: [
    { kind: 'clue', pos: new THREE.Vector3(-4, 0.8, 1) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 1.5, -2.5) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  lava: [
    { kind: 'clue', pos: new THREE.Vector3(3, 0.6, 1) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 1.2, -2.5) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
  space: [
    { kind: 'clue', pos: new THREE.Vector3(-3.5, 1, 1) },
    { kind: 'terminal', pos: new THREE.Vector3(0, 1.5, -2.5) },
    { kind: 'door', pos: new THREE.Vector3(0, 1.8, -7.4) },
  ],
};

const INTERACT_RADIUS = 2.8;
const PLAYER_COLOR: Record<string, string> = {
  forest: '#00ff88',
  cyber: '#a78bfa',
  ice: '#7dd3fc',
  lava: '#fb923c',
  space: '#34d399',
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

  // Persist scene state
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

  // Recalculate nearby object whenever player moves
  const handlePlayerMove = useCallback((pos: THREE.Vector3) => {
    setPlayerPos(pos.clone());
    setSceneState((curr) => ({ ...curr, playerPosition: { x: pos.x, y: pos.y, z: pos.z } }));
  }, []);

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

  // "Press E" keyboard handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || !nearby) return;
      e.preventDefault();
      if (nearby === 'terminal') onChallenge();
      else if (nearby === 'clue') onClue();
      else if (nearby === 'door') onDoor();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearby, onChallenge, onClue, onDoor]);

  const chamberProps = { completed, playerPos, nearby };
  const playerColor = PLAYER_COLOR[chamberType] ?? '#00ff88';

  const bgColor =
    chamberType === 'space'
      ? '#000208'
      : chamberType === 'lava'
        ? '#120302'
        : chamberType === 'ice'
          ? '#020c1b'
          : chamberType === 'cyber'
            ? '#050010'
            : '#030f09';

  return (
    <section
      className="relative h-[min(74vh,700px)] overflow-hidden rounded-2xl border border-white/10"
      style={{ background: bgColor }}
      aria-label="3D escape room"
    >
      <Canvas
        shadows
        dpr={quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [1, 1]}
        camera={{ position: [0, 4, 8], fov: 52 }}
        fallback={
          <div className="grid h-full place-items-center text-sm text-slate-300">
            WebGL unavailable — switch to 2D.
          </div>
        }
      >
        {chamberType === 'cyber' && <CyberLabChamber {...chamberProps} />}
        {chamberType === 'ice' && <IceCaveChamber {...chamberProps} />}
        {chamberType === 'lava' && <LavaChamber {...chamberProps} />}
        {chamberType === 'space' && <SpaceChamber {...chamberProps} />}
        {chamberType === 'forest' && <ForestChamber {...chamberProps} />}

        <PlayerCapsule color={playerColor} onPositionChange={handlePlayerMove} />
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

      {/* Proximity prompt (HTML overlay, shows what E will do) */}
      {nearby && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
          <span
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-5 py-2 text-sm font-bold text-white backdrop-blur"
            style={{ borderColor: playerColor + '66', color: playerColor }}
          >
            <kbd className="rounded border border-current bg-white/10 px-2 py-0.5 text-xs text-white">
              E
            </kbd>
            {nearby === 'terminal'
              ? 'Activate terminal'
              : nearby === 'clue'
                ? 'Read clue'
                : completed
                  ? 'Escape the room'
                  : 'Try the gate'}
          </span>
        </div>
      )}

      <p className="pointer-events-none absolute inset-x-3 bottom-2 text-center text-[10px] text-slate-600">
        WASD · move &nbsp;|&nbsp; Drag · orbit &nbsp;|&nbsp; E · interact
      </p>
    </section>
  );
}
