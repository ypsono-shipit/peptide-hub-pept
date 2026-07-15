"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, MeshTransmissionMaterial, Float } from "@react-three/drei";
import { Vector3, Quaternion } from "three";

// Ball-and-stick peptide chain suspended inside the capsule, in local
// [-1, 1] capsule-space coordinates.
const ATOMS: { pos: [number, number, number]; r: number; color: string }[] = [
  { pos: [-0.28, -0.55, 0.05], r: 0.11, color: "#e5e5e5" },
  { pos: [0.05, -0.15, -0.05], r: 0.135, color: "#f5f5f5" },
  { pos: [0.35, 0.1, 0.08], r: 0.1, color: "#a3a3a3" },
  { pos: [0.12, 0.5, -0.04], r: 0.09, color: "#d4d4d4" },
];
const BONDS: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
];

function Bond({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const { mid, length, quaternion } = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const dir = end.clone().sub(start);
    return {
      mid: start.clone().add(end).multiplyScalar(0.5),
      length: dir.length(),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize()),
    };
  }, [from, to]);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.025, 0.025, length, 8]} />
      <meshStandardMaterial color="#c4c4c4" roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

function Molecule() {
  return (
    <group>
      {ATOMS.map((a, i) => (
        <mesh key={i} position={a.pos}>
          <sphereGeometry args={[a.r, 24, 24]} />
          <meshStandardMaterial color={a.color} roughness={0.25} metalness={0.2} />
        </mesh>
      ))}
      {BONDS.map(([a, b], i) => (
        <Bond key={i} from={ATOMS[a].pos} to={ATOMS[b].pos} />
      ))}
    </group>
  );
}

function CapsuleShell() {
  return (
    <mesh rotation={[0, 0, Math.PI / 2.4]}>
      <capsuleGeometry args={[0.62, 1.5, 12, 32]} />
      <MeshTransmissionMaterial
        thickness={0.35}
        roughness={0.06}
        transmission={1}
        ior={1.25}
        chromaticAberration={0.04}
        backside
        color="#f0f0f0"
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-3, -2, 2]} intensity={0.8} color="#d4d4d4" />

      <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.6}>
        <group>
          <CapsuleShell />
          <Molecule />
        </group>
      </Float>

      <Environment preset="city" />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={2.2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(2 * Math.PI) / 3}
      />
    </>
  );
}

/** Interactive, drag-to-rotate 3D peptide capsule — real WebGL, not a static image. */
export function PeptideCapsule3D() {
  return (
    <div className="h-[300px] w-full cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 32 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
