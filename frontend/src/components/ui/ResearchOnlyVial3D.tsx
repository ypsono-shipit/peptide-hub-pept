"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture, Environment, ContactShadows } from "@react-three/drei";
import type { Group } from "three";
import * as THREE from "three";

function RotatingVial() {
  const group = useRef<Group>(null);
  const texture = useTexture("/research-only-vial.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.55;
    }
  });

  // Double-sided plane so the product shot stays readable while spinning
  return (
    <group ref={group} position={[0, 0.15, 0]}>
      <mesh>
        <planeGeometry args={[1.55, 1.95]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function GlowRing() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
      <ringGeometry args={[0.55, 0.85, 64]} />
      <meshBasicMaterial color="#f5f5f5" transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <pointLight position={[0, -0.5, 2]} intensity={0.5} color="#ffffff" />

      <Suspense fallback={null}>
        <RotatingVial />
      </Suspense>

      <GlowRing />
      <ContactShadows
        position={[0, -0.88, 0]}
        opacity={0.45}
        scale={4}
        blur={2.5}
        far={2}
        color="#000000"
      />
      <Environment preset="studio" />
    </>
  );
}

/** Research Only product vial — slow Y-axis spin (WebGL). */
export function ResearchOnlyVial3D() {
  return (
    <div className="h-full min-h-[200px] w-full">
      <Canvas
        camera={{ position: [0, 0.1, 3.2], fov: 32 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
