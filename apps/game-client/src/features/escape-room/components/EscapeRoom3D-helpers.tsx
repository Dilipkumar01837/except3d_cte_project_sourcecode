/**
 * Shared Three.js scene helpers used by both the character and environment modules.
 *
 * Kept in a dedicated file so neither EscapeRoom3D-characters.tsx nor
 * EscapeRoom3D-environments.tsx needs to re-declare or import from the other.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

export function PulsingLight({
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

export function RotatingGear({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
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
