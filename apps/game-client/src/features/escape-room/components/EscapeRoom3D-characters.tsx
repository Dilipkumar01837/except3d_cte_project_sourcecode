/**
 * Character meshes for the 3D escape room scene.
 *
 * Exports:
 *   HumanPlayer    – WASD-controlled player built from primitive meshes.
 *   GuideNPC       – Stationary guide NPC with typed speech bubble.
 *   TerminalKeeper – NPC standing at the challenge terminal.
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ─── Humanoid Player ──────────────────────────────────────────────────────────
// Built from primitive meshes: head sphere, torso box, two arms, two legs.
// Moves with WASD, turns to face movement direction, arm-swings while walking.

export function HumanPlayer({
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

export function GuideNPC({
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
      return () => {
        clearInterval(interval);
      };
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

export function TerminalKeeper({
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
