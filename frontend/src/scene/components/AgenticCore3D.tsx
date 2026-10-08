"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/useSceneStore";

const STATE_COLORS: Record<string, { primary: string; secondary: string; pulseSpeed: number }> = {
  IDLE: { primary: "#6366F1", secondary: "#8B5CF6", pulseSpeed: 1.0 },
  PLANNING: { primary: "#A855F7", secondary: "#EC4899", pulseSpeed: 2.2 },
  RUNNING: { primary: "#06B6D4", secondary: "#10B981", pulseSpeed: 2.5 },
  WAITING_APPROVAL: { primary: "#F59E0B", secondary: "#EF4444", pulseSpeed: 1.8 },
  RECOVERING: { primary: "#EC4899", secondary: "#A855F7", pulseSpeed: 3.0 },
  COMPLETED: { primary: "#10B981", secondary: "#06B6D4", pulseSpeed: 0.8 },
};

interface AgenticCore3DProps {
  position?: [number, number, number];
}

export function AgenticCore3D({ position = [0, 0, 0] }: AgenticCore3DProps) {
  const outerLatticeRef = useRef<THREE.Mesh>(null);
  const innerNucleusRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);

  const coreState = useSceneStore((s) => s.telemetry.coreState || "IDLE");
  const selectEntity = useSceneStore((s) => s.selectEntity);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);

  const theme = STATE_COLORS[coreState] || STATE_COLORS.IDLE;
  const primaryColor = useMemo(() => new THREE.Color(theme.primary), [theme.primary]);
  const secondaryColor = useMemo(() => new THREE.Color(theme.secondary), [theme.secondary]);

  // Generate orbital particles for ring
  const ringParticleCount = 40;
  const ringParticles = useMemo(() => {
    const pos = new Float32Array(ringParticleCount * 3);
    const radius = 2.4;
    for (let i = 0; i < ringParticleCount; i++) {
      const angle = (i / ringParticleCount) * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = 0;
    }
    return pos;
  }, [ringParticleCount]);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    const pulse = 1 + Math.sin(time * theme.pulseSpeed * 2) * 0.08;

    // 1. Rotate outer wireframe lattice
    if (outerLatticeRef.current) {
      outerLatticeRef.current.rotation.y += delta * 0.25;
      outerLatticeRef.current.rotation.x += delta * 0.15;
      outerLatticeRef.current.scale.set(pulse, pulse, pulse);
    }

    // 2. Pulse inner nucleus
    if (innerNucleusRef.current) {
      innerNucleusRef.current.rotation.y -= delta * 0.4;
      const innerPulse = 1 + Math.sin(time * theme.pulseSpeed * 3) * 0.12;
      innerNucleusRef.current.scale.set(innerPulse, innerPulse, innerPulse);
    }

    // 3. Rotate orbital rings around varied axes
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.5;
      ring1Ref.current.rotation.x = Math.PI / 4;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.4;
      ring2Ref.current.rotation.y = Math.PI / 3;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x += delta * 0.35;
      ring3Ref.current.rotation.y = -Math.PI / 4;
    }
  });

  return (
    <group
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
      {/* Outer Geodesic Wireframe Lattice */}
      <mesh ref={outerLatticeRef}>
        <icosahedronGeometry args={[1.6, 2]} />
        <meshStandardMaterial
          color={primaryColor}
          wireframe
          transparent
          opacity={0.65}
          emissive={primaryColor}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Inner Glowing Energy Nucleus */}
      <mesh ref={innerNucleusRef}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial
          color={secondaryColor}
          emissive={primaryColor}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Point Light emitted from core */}
      <pointLight color={primaryColor} intensity={2.5} distance={12} />

      {/* Orbital Ring 1 */}
      <group ref={ring1Ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={ringParticleCount}
              array={ringParticles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.12}
            color={theme.primary}
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>
      </group>

      {/* Orbital Ring 2 */}
      <group ref={ring2Ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={ringParticleCount}
              array={ringParticles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.1}
            color={theme.secondary}
            transparent
            opacity={0.7}
            sizeAttenuation
          />
        </points>
      </group>

      {/* Orbital Ring 3 */}
      <group ref={ring3Ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={ringParticleCount}
              array={ringParticles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            color="#06B6D4"
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      </group>
    </group>
  );
}
