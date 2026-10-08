"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SpatialAgentEntity } from "../types";
import { useSceneStore } from "../state/useSceneStore";

interface SculpturalAgent3DProps {
  agent: SpatialAgentEntity;
}

export function SculpturalAgent3D({ agent }: SculpturalAgent3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const selectEntity = useSceneStore((s) => s.selectEntity);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const selectedEntity = useSceneStore((s) => s.selectedEntity);
  const hoveredEntity = useSceneStore((s) => s.hoveredEntity);

  const isSelected = selectedEntity?.type === "AGENT" && selectedEntity.id === agent.id;
  const isHovered = hoveredEntity?.type === "AGENT" && hoveredEntity.id === agent.id;

  const agentColor = useMemo(() => new THREE.Color(agent.color || "#06b6d4"), [agent.color]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * (agent.orbitSpeed || 0.2) + (agent.orbitAngle || 0);
    const radius = agent.orbitRadius || 5.5;

    // Orbit coordinates with slight Y bobbing
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const y = Math.sin(t * 1.5) * 0.4 + 0.2;

    if (beaconRef.current) {
      beaconRef.current.position.set(x, y, z);
    }

    if (meshRef.current) {
      meshRef.current.rotation.x += 0.015;
      meshRef.current.rotation.y += 0.02;
    }

    if (ringRef.current && (agent.status === "RUNNING" || isSelected || isHovered)) {
      ringRef.current.rotation.z += 0.03;
    }
  });

  return (
    <group
      ref={beaconRef}
      onClick={(e) => {
        e.stopPropagation();
        if (beaconRef.current) {
          const pos: [number, number, number] = [
            beaconRef.current.position.x,
            beaconRef.current.position.y,
            beaconRef.current.position.z,
          ];
          selectEntity({
            type: "AGENT",
            id: agent.id,
            data: { ...agent, position: pos },
          });
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredEntity({ type: "AGENT", id: agent.id, data: agent });
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoveredEntity(null);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Precision Polyhedral Agent Sculpture */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color="#090d16"
          emissive={agentColor}
          emissiveIntensity={isSelected ? 1.8 : isHovered ? 1.4 : agent.status === "RUNNING" ? 0.9 : 0.4}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Outer Status Ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.42, 0.46, 32]} />
        <meshBasicMaterial
          color={agentColor}
          transparent
          opacity={isSelected || isHovered ? 0.9 : agent.status === "RUNNING" ? 0.6 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
