import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { WorldLevel } from '@/features/worlds/lib/world-api';
import { sceneApi, type SceneState } from '../lib/scene-api';

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
      <color attach="background" args={['#06131a']} />
      <ambientLight intensity={0.45} color="#9de8c6" />
      <directionalLight
        castShadow
        position={[4, 8, 3]}
        intensity={2}
        color="#c9ffe3"
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 2, -2]} intensity={8} distance={10} color="#31d6a0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#0b332b" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2, -7]} receiveShadow>
        <boxGeometry args={[20, 4, 0.4]} />
        <meshStandardMaterial color="#122f3a" />
      </mesh>
      <mesh position={[-8, 2, 0]}>
        <boxGeometry args={[0.4, 4, 14]} />
        <meshStandardMaterial color="#123b35" />
      </mesh>
      <mesh position={[8, 2, 0]}>
        <boxGeometry args={[0.4, 4, 14]} />
        <meshStandardMaterial color="#123b35" />
      </mesh>
      <mesh position={[0, 1.2, -2]} castShadow onClick={onTerminal}>
        <boxGeometry args={[1.4, 2.4, 0.7]} />
        <meshStandardMaterial color="#1cc89b" emissive="#063c32" emissiveIntensity={2} />
      </mesh>
      <Html position={[0, 2.7, -2]} center>
        <span className="rounded bg-black/70 px-2 py-1 text-xs font-bold text-emerald-200">
          TERMINAL
        </span>
      </Html>
      <mesh position={[0, 1.6, -6.7]} castShadow onClick={onDoor}>
        <boxGeometry args={[3, 3.2, 0.35]} />
        <meshStandardMaterial
          color={completed ? '#f0c96b' : '#552c50'}
          emissive={completed ? '#aa7427' : '#160916'}
          emissiveIntensity={completed ? 1.5 : 0.2}
        />
      </mesh>
      <Html position={[0, 3.5, -6.5]} center>
        <span className="rounded bg-black/70 px-2 py-1 text-xs font-bold text-amber-200">
          {completed ? 'OPEN GATE' : 'SEALED GATE'}
        </span>
      </Html>
      <Sparkles count={80} scale={[16, 5, 12]} size={2} speed={0.25} color="#55e6bb" />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} target={[0, 1, -2]} />
    </>
  );
}

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
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  useFrame((_, delta) => {
    const direction = new THREE.Vector3(
      Number(keys.current.has('d')) - Number(keys.current.has('a')),
      0,
      Number(keys.current.has('s')) - Number(keys.current.has('w')),
    );
    if (direction.lengthSq() === 0) return;
    direction.normalize().multiplyScalar(Math.min(delta, 0.05) * 4);
    position.current.add(direction);
    position.current.x = THREE.MathUtils.clamp(position.current.x, -7, 7);
    position.current.z = THREE.MathUtils.clamp(position.current.z, -5.5, 5.5);
    onSave({ x: position.current.x, y: position.current.y, z: position.current.z });
  });
  return null;
}

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
  const [state, setState] = useState<SceneState>({
    playerPosition: { x: 0, y: 1.6, z: 4 },
    unlockedObjects: [],
    sceneProgress: {},
  });
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  useEffect(() => {
    void sceneApi
      .load(level.id)
      .then((result) => {
        setState(result.state);
      })
      .catch(() => undefined);
  }, [level.id]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void sceneApi.save(level.id, state).catch(() => undefined);
    }, 5000);
    return () => {
      window.clearInterval(timer);
    };
  }, [level.id, state]);
  const savePosition = (position: SceneState['playerPosition']) => {
    setState((current) => ({ ...current, playerPosition: position }));
  };
  return (
    <section
      className="relative h-[min(72vh,680px)] overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#06131a]"
      aria-label="3D escape room"
    >
      <Canvas
        shadows
        dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
        camera={{ position: [0, 3, 7], fov: 55 }}
        fallback={
          <div className="grid h-full place-items-center text-sm text-slate-300">
            WebGL is unavailable. Use the 2D room.
          </div>
        }
      >
        <ForestChamber
          completed={completed}
          onTerminal={onChallenge}
          onDoor={() => {
            if (completed) onRefresh();
          }}
        />
        <KeyboardMover state={state} onSave={savePosition} />
      </Canvas>
      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onFallback}
          className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-xs font-bold text-white"
        >
          Skip 3D
        </button>
        <label className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-xs text-white">
          Quality{' '}
          <select
            value={quality}
            onChange={(event) => {
              setQuality(event.target.value as typeof quality);
            }}
            className="ml-1 bg-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-3 py-2 text-xs text-slate-200">
        WASD to move · drag to look · click the terminal
      </p>
    </section>
  );
}
