import type {} from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Button } from '@code-to-escape/ui';
import { APP_NAME } from '@code-to-escape/shared';

function SceneBackground() {
  return (
    <>
      <color attach="background" args={['#0c4a6e']} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Stars radius={80} depth={40} count={1200} factor={3} fade speed={0.5} />
      <mesh rotation={[0.4, 0.6, 0]}>
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial color="#0ea5e9" wireframe />
      </mesh>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.6} />
    </>
  );
}

export function HomePage() {
  return (
    <section className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <SceneBackground />
        </Canvas>
      </div>
      <div className="relative z-10 flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6">
        <motion.div
          className="max-w-xl rounded-2xl border border-brand-500/30 bg-brand-900/70 p-10 text-center backdrop-blur"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white">{APP_NAME}</h1>
          <p className="mt-4 text-brand-50">
            A gamified real-time programming learning platform. Foundation ready for Day 2.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="primary">Explore Worlds</Button>
            <Button variant="secondary">View Docs</Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
