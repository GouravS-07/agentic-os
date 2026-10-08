"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SpatialAgentEntity } from "../types";
import { useSceneStore } from "../state/useSceneStore";

interface MinimalAgent3DProps {
  agent: SpatialAgentEntity;
}

export function MinimalAgent3D({ agent }: MinimalAgent3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const selectEntity = useSceneStore((s) => s.selectEntity);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const selectedEntity = useSceneStore((s) => s.selectedEntity);
  const hoveredEntity = useSceneStore((s) => s.hoveredEntity);

  const isSelected = selectedEntity?.type === "AGENT" && selectedEntity.id === agent.id;
  const isHovered = hoveredEntity?.type === "AGENT" && hoveredEntity.id === agent.id;

  const agentAccent = useMemo(() => new THREE.Color(agent.color || "#38bdf8"), [agent.color]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * (agent.orbitSpeed || 0.18) + (agent.orbitAngle || 0);
    const radius = agent.orbitRadius || 5.2;

    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const y = Math.sin(t * 1.4) * 0.3;

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.015;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (groupRef.current) {
          selectEntity({
            type: "AGENT",
            id: agent.id,
            data: {
              ...agent,
              position: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z],
            },
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
      {/* Precision Polyhedral Monolith */}
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color="#0d0f17"
          emissive={agentAccent}
          emissiveIntensity={isSelected || isHovered ? 1.4 : agent.status === "RUNNING" ? 0.7 : 0.25}
          roughness={0.15}
          metalness={0.92}
        />
      </mesh>
    </group>
  );
}
