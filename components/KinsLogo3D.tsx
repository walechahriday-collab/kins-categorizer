'use client';

import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, Center, Float, Environment, SpotLight } from '@react-three/drei';
import * as THREE from 'three';

/* ── Floating gold particles ── */
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = new Float32Array(
    Array.from({ length: 120 }, () => [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 5,
    ]).flat()
  );

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.04;
      const mat = ref.current.material as THREE.PointsMaterial;
      mat.opacity = 0.3 + Math.sin(clock.elapsedTime * 0.9) * 0.15;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c9a84c"
        size={0.035}
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

/* ── The Kin's text in 3D ── */
function KinsText({ onOpen }: { onOpen: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Slow Y rotation — speeds up on hover
      groupRef.current.rotation.y += delta * (hovered ? 0.6 : 0.18);
    }
  });

  return (
    <Float speed={1.6} rotationIntensity={0.04} floatIntensity={0.45}>
      <group
        ref={groupRef}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onClick={onOpen}
        scale={hovered ? 1.07 : 1}
      >
        {/* Subtle glow plane behind text */}
        <mesh position={[0, 0, -0.5]}>
          <planeGeometry args={[5, 2.5]} />
          <meshBasicMaterial
            color="#cc1515"
            transparent
            opacity={hovered ? 0.07 : 0.04}
          />
        </mesh>

        {/* Main "Kin's" text */}
        <Center>
          <Text3D
            font="/fonts/optimer_bold.typeface.json"
            size={1.05}
            height={0.32}          /* extrusion depth */
            curveSegments={14}
            bevelEnabled
            bevelThickness={0.04}
            bevelSize={0.03}
            bevelSegments={6}
            letterSpacing={0.04}
          >
            {`Kin's`}
            <meshPhysicalMaterial
              color={hovered ? '#e01a1a' : '#cc1515'}
              roughness={0.06}
              metalness={0.15}
              clearcoat={1}
              clearcoatRoughness={0.04}
              reflectivity={1}
              envMapIntensity={2}
            />
          </Text3D>
        </Center>

        {/* "FOOTWEAR" subtitle */}
        <Center position={[0, -0.95, 0]}>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={0.22}
            height={0.06}
            curveSegments={6}
            bevelEnabled={false}
            letterSpacing={0.25}
          >
            FOOTWEAR
            <meshPhysicalMaterial
              color="#c9a84c"
              roughness={0.15}
              metalness={0.4}
              clearcoat={0.6}
              envMapIntensity={1.5}
            />
          </Text3D>
        </Center>
      </group>
    </Float>
  );
}

/* ── Lighting rig ── */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      {/* Main warm white front key light */}
      <SpotLight
        position={[0, 4, 5]}
        angle={0.45}
        penumbra={0.8}
        intensity={3.5}
        color="#fff6e8"
        castShadow
      />
      {/* Red fill from below — adds depth to the letters */}
      <pointLight position={[0, -3, 2]} intensity={1.2} color="#cc1515" />
      {/* Gold rim from right */}
      <pointLight position={[4, 1, -1]} intensity={1.5} color="#c9a84c" />
      {/* Blue-ish cool from left for contrast */}
      <pointLight position={[-4, 2, 1]} intensity={0.5} color="#8888cc" />
    </>
  );
}

/* ── Canvas wrapper ── */
export default function KinsLogo3D({ onOpen }: { onOpen: () => void }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.3, 6], fov: 38 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Lights />

      <Suspense fallback={null}>
        <Environment preset="city" />
        <KinsText onOpen={onOpen} />
      </Suspense>

      <Particles />
    </Canvas>
  );
}
