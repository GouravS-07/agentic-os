"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/useSceneStore";

interface SculpturalMonolith3DProps {
  position?: [number, number, number];
}

export function SculpturalMonolith3D({ position = [0, 0, 0] }: SculpturalMonolith3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const primaryMeshRef = useRef<THREE.Mesh>(null);
  const secondaryMeshRef = useRef<THREE.Mesh>(null);
  const corePolyhedronRef = useRef<THREE.Mesh>(null);

  const { pointer } = useThree();
  const coreState = useSceneStore((s) => s.telemetry.coreState || "IDLE");
  const selectEntity = useSceneStore((s) => s.selectEntity);

  // Brushed Satin Titanium Material (High Specular, Rich Metallic Sheen)
  const titaniumMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#2a3245",
      roughness: 0.14,
      metalness: 0.96,
      envMapIntensity: 2.8,
    });
  }, []);

  // Smoked Frosted Crystal Ribbon
  const smokedCrystalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#475569",
      roughness: 0.08,
      metalness: 0.85,
      transparent: true,
      opacity: 0.6,
    });
  }, []);

  // Subtle core emissive seam
  const coreEmissive = useMemo(() => {
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

    // Deliberate, smooth kinetic rotation
    if (primaryMeshRef.current) {
      primaryMeshRef.current.rotation.x = time * 0.08;
      primaryMeshRef.current.rotation.y = time * 0.12;
    }
    if (secondaryMeshRef.current) {
      secondaryMeshRef.current.rotation.x = -time * 0.1;
      secondaryMeshRef.current.rotation.z = time * 0.11;
    }
    if (corePolyhedronRef.current) {
      corePolyhedronRef.current.rotation.y = time * 0.18;
      const pulse = 1 + Math.sin(time * 1.5) * 0.04;
      corePolyhedronRef.current.scale.set(pulse, pulse, pulse);
    }

    // Smooth cursor tilt inertia
    if (groupRef.current) {
      const targetRotX = pointer.y * 0.35;
      const targetRotY = pointer.x * 0.45;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 2.2);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 2.2);
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
      {/* Primary Parametric Ribbon: Satin Titanium */}
      <mesh ref={primaryMeshRef} material={titaniumMaterial}>
        <torusKnotGeometry args={[2.0, 0.46, 160, 36, 2, 3]} />
      </mesh>

      {/* Interlocking Translucent Ribbon: Smoked Crystal */}
      <mesh ref={secondaryMeshRef} material={smokedCrystalMaterial}>
        <torusKnotGeometry args={[1.98, 0.26, 128, 28, 3, 4]} />
      </mesh>

      {/* Precision Polyhedral Monolith Heart */}
      <mesh ref={corePolyhedronRef}>
        <octahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive={coreEmissive}
          emissiveIntensity={coreState === "RUNNING" ? 0.95 : 0.4}
          roughness={0.18}
          metalness={0.92}
        />
      </mesh>
    </group>
  );
}
