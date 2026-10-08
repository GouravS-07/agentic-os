"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/useSceneStore";

interface SculpturalCore3DProps {
  position?: [number, number, number];
}

const STATE_LUMINANCE: Record<string, { emissive: string; intensity: number; speed: number }> = {
  IDLE: { emissive: "#0ea5e9", intensity: 0.4, speed: 0.4 },
  PLANNING: { emissive: "#a855f7", intensity: 0.9, speed: 1.2 },
  RUNNING: { emissive: "#06b6d4", intensity: 1.1, speed: 1.4 },
  WAITING_APPROVAL: { emissive: "#f59e0b", intensity: 0.8, speed: 0.8 },
  RECOVERING: { emissive: "#ec4899", intensity: 1.2, speed: 1.8 },
  COMPLETED: { emissive: "#10b981", intensity: 0.6, speed: 0.3 },
};

export function SculpturalCore3D({ position = [0, 0, 0] }: SculpturalCore3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRingARef = useRef<THREE.Mesh>(null);
  const outerRingBRef = useRef<THREE.Mesh>(null);
  const innerMonolithRef = useRef<THREE.Mesh>(null);
  const orbitalPivotsRef = useRef<THREE.Group>(null);

  const { pointer } = useThree();
  const coreState = useSceneStore((s) => s.telemetry.coreState || "IDLE");
  const selectEntity = useSceneStore((s) => s.selectEntity);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);

  const stateConfig = STATE_LUMINANCE[coreState] || STATE_LUMINANCE.IDLE;
  const emissiveColor = useMemo(() => new THREE.Color(stateConfig.emissive), [stateConfig.emissive]);

  // Obsidian metallic material configuration
  const obsidianMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#090d16",
      roughness: 0.18,
      metalness: 0.92,
      envMapIntensity: 1.5,
    });
  }, []);

  // Internal glowing conduit material
  const conduitMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#030712",
      emissive: emissiveColor,
      emissiveIntensity: stateConfig.intensity,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: true,
    });
  }, [emissiveColor, stateConfig.intensity]);

  // Subtle coordinate particles floating around the monolith
  const particulateCount = 60;
  const particulateGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particulateCount * 3);
    for (let i = 0; i < particulateCount; i++) {
      const radius = 2.2 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime() * stateConfig.speed;

    // Smooth mouse inertia tilt
    if (groupRef.current) {
      const targetRotX = pointer.y * 0.25;
      const targetRotY = pointer.x * 0.35;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 3);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 3);
    }

    // Outer architectural rings counter-rotation
    if (outerRingARef.current) {
      outerRingARef.current.rotation.x = time * 0.25;
      outerRingARef.current.rotation.y = time * 0.35;
    }
    if (outerRingBRef.current) {
      outerRingBRef.current.rotation.y = -time * 0.28;
      outerRingBRef.current.rotation.z = time * 0.22;
    }

    // Inner monolithic core rotation
    if (innerMonolithRef.current) {
      innerMonolithRef.current.rotation.x = time * 0.15;
      innerMonolithRef.current.rotation.y = time * 0.2;
    }

    // Orbital particulate drift
    if (orbitalPivotsRef.current) {
      orbitalPivotsRef.current.rotation.y = time * 0.08;
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
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredEntity({ type: "CORE", id: "agentic-core" });
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoveredEntity(null);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Outer Segmented Torus Sculpture - Ring A */}
      <mesh ref={outerRingARef} material={obsidianMaterial}>
        <torusGeometry args={[2.2, 0.06, 16, 64]} />
      </mesh>

      {/* Outer Segmented Torus Sculpture - Ring B */}
      <mesh ref={outerRingBRef} material={obsidianMaterial}>
        <torusGeometry args={[1.9, 0.04, 16, 64]} />
      </mesh>

      {/* Primary Computational Monolith: Precision Faceted Polyhedron */}
      <mesh ref={innerMonolithRef}>
        <octahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial
          color="#0b0f19"
          roughness={0.12}
          metalness={0.95}
          wireframeLinewidth={1}
        />
      </mesh>

      {/* Inner Glowing Geometric Conduit */}
      <mesh material={conduitMaterial}>
        <icosahedronGeometry args={[0.85, 1]} />
      </mesh>

      {/* Dense Luminous Core Heart */}
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color={emissiveColor} transparent opacity={0.85} />
      </mesh>

      {/* Floating Particulate Field */}
      <group ref={orbitalPivotsRef}>
        <points geometry={particulateGeo}>
          <pointsMaterial
            size={0.035}
            color="#38bdf8"
            transparent
            opacity={0.4}
            sizeAttenuation
          />
        </points>
      </group>
    </group>
  );
}
