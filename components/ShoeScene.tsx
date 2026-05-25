'use client';

import { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Float, SpotLight } from '@react-three/drei';
import * as THREE from 'three';

/* ── Shoe geometry ── */
function ShoeUpper({ hovered }: { hovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Stiletto pump profile facing right
    shape.moveTo(-1.55, 0.08);
    shape.bezierCurveTo(-1.5, 0, -1.3, 0, -1.0, 0);
    shape.lineTo(1.55, 0);
    shape.bezierCurveTo(1.9, 0, 2.1, 0.12, 2.2, 0.32);
    shape.bezierCurveTo(2.28, 0.52, 2.12, 0.8, 1.88, 0.9);
    shape.bezierCurveTo(1.5, 1.1, 0.7, 1.28, 0.0, 1.38);
    shape.bezierCurveTo(-0.55, 1.46, -1.05, 1.42, -1.3, 1.22);
    shape.bezierCurveTo(-1.46, 1.08, -1.54, 0.78, -1.55, 0.08);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.62,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 5,
    });
    geo.center();
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (hovered ? 0.8 : 0.35);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow>
      <meshPhysicalMaterial
        color={hovered ? '#a01830' : '#7a1020'}
        roughness={0.08}
        metalness={0.0}
        clearcoat={1}
        clearcoatRoughness={0.04}
        reflectivity={1}
        envMapIntensity={1.8}
      />
    </mesh>
  );
}

function SoleAndHeel({ hovered }: { hovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (hovered ? 0.8 : 0.35);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Sole */}
      <mesh position={[0, -0.62, 0]} castShadow>
        <boxGeometry args={[3.2, 0.06, 0.72]} />
        <meshPhysicalMaterial
          color="#e8d8b8"
          roughness={0.55}
          metalness={0}
          clearcoat={0.3}
        />
      </mesh>
      {/* Stiletto heel */}
      <mesh position={[-1.38, -0.3, 0]} rotation={[0, 0, 0.06]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 0.65, 8]} />
        <meshPhysicalMaterial
          color="#1a1a22"
          metalness={0.85}
          roughness={0.08}
          clearcoat={0.8}
        />
      </mesh>
    </group>
  );
}

/* ── Floating sparkles ── */
function Sparkles() {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 60; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 4
        )
      );
    }
    return pts;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  const matRef = useRef<THREE.PointsMaterial>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.35 + Math.sin(clock.elapsedTime * 1.2) * 0.15;
    }
  });

  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={matRef}
        color="#c9a84c"
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

/* ── Click-detection plane ── */
function ClickPlane({ onClick }: { onClick: () => void }) {
  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[5, 4]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── Scene ── */
function Scene({ onOpen }: { onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#c9a84c" />
      <SpotLight
        position={[0, 5, 3]}
        angle={0.4}
        penumbra={0.8}
        intensity={2}
        color="#fff8e8"
        castShadow
      />

      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      <Float speed={1.8} rotationIntensity={0.06} floatIntensity={0.5}>
        <group
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
          onClick={onOpen}
          scale={hovered ? 1.06 : 1}
        >
          <ShoeUpper hovered={hovered} />
          <SoleAndHeel hovered={hovered} />
          <ClickPlane onClick={onOpen} />
        </group>
      </Float>

      <Sparkles />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={false}
      />
    </>
  );
}

/* ── Export ── */
export default function ShoeScene({ onOpen }: { onOpen: () => void }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.5, 5], fov: 35 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene onOpen={onOpen} />
    </Canvas>
  );
}
