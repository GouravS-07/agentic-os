"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/useSceneStore";

interface ArchitecturalMonolith3DProps {
  position?: [number, number, number];
}

export function ArchitecturalMonolith3D({ position = [0, 0, 0] }: ArchitecturalMonolith3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const primaryMeshRef = useRef<THREE.Mesh>(null);
  const secondaryMeshRef = useRef<THREE.Mesh>(null);
  const innerNucleusRef = useRef<THREE.Mesh>(null);

  const { pointer } = useThree();
  const coreState = useSceneStore((s) => s.telemetry.coreState || "IDLE");
  const selectEntity = useSceneStore((s) => s.selectEntity);

  // Brushed Graphite Titanium Material with Sharp Specular Highlights
  const titaniumMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#232936",
      roughness: 0.18,
      metalness: 0.94,
      envMapIntensity: 2.5,
    });
  }, []);

  // Smoked Obsidian Glass Ribbon
  const smokedGlassMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#334155",
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.65,
    });
  }, []);

  // Subtle core seam
  const seamEmissive = useMemo(() => {
    switch (coreState) {
      case "RUNNING":
        return new THREE.Color("#06b6d4");
      case "PLANNING":
        return new THREE.Color("#a855f7");
      case "RECOVERING":
        return new THREE.Color("#ec4899");
      case "WAITING_APPROVAL":
        return new THREE.Color("#f59e0b");
      default:
        return new THREE.Color("#38bdf8");
    }
  }, [coreState]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Smooth kinetic rotation
    if (primaryMeshRef.current) {
      primaryMeshRef.current.rotation.x = time * 0.1;
      primaryMeshRef.current.rotation.y = time * 0.15;
    }
    if (secondaryMeshRef.current) {
      secondaryMeshRef.current.rotation.x = -time * 0.12;
      secondaryMeshRef.current.rotation.z = time * 0.14;
    }
    if (innerNucleusRef.current) {
      innerNucleusRef.current.rotation.y = time * 0.2;
      const pulse = 1 + Math.sin(time * 1.5) * 0.05;
      innerNucleusRef.current.scale.set(pulse, pulse, pulse);
    }

    // High-end mouse inertia tilt
    if (groupRef.current) {
      const targetRotX = pointer.y * 0.35;
      const targetRotY = pointer.x * 0.45;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2.5);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2.5);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity({ type: "CORE", id: "agentic-core", data: { state: coreState } });
      }}
    >
      {/* Primary Architectural Continuous Form: Precision Torus Knot */}
      <mesh ref={primaryMeshRef} material={titaniumMaterial}>
        <torusKnotGeometry args={[1.9, 0.42, 128, 32, 2, 3]} />
      </mesh>

      {/* Interlocking Translucent Smoked Ribbon */}
      <mesh ref={secondaryMeshRef} material={smokedGlassMaterial}>
        <torusKnotGeometry args={[1.88, 0.24, 96, 24, 3, 4]} />
      </mesh>

      {/* Internal Monolithic Core Heart */}
      <mesh ref={innerNucleusRef}>
        <octahedronGeometry args={[0.75, 0]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive={seamEmissive}
          emissiveIntensity={coreState === "RUNNING" ? 0.9 : 0.45}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}
