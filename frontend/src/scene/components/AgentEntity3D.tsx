"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SpatialAgentEntity } from "../types";
import { useSceneStore } from "../state/useSceneStore";

interface AgentEntity3DProps {
  agent: SpatialAgentEntity;
}

export function AgentEntity3D({ agent }: AgentEntity3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const selectEntity = useSceneStore((s) => s.selectEntity);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const selectedEntity = useSceneStore((s) => s.selectedEntity);

  const isSelected = selectedEntity?.type === "AGENT" && selectedEntity.id === agent.id;
  const agentColor = useMemo(() => new THREE.Color(agent.color), [agent.color]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    // Orbital rotation
    const currentAngle = agent.orbitAngle + time * (agent.orbitSpeed * 0.4);
    const x = Math.cos(currentAngle) * agent.orbitRadius;
    const z = Math.sin(currentAngle) * agent.orbitRadius;
    const y = Math.sin(time * 1.5 + agent.orbitRadius) * 0.6;

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.x += 0.01;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z -= 0.03;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (groupRef.current) {
          const pos: [number, number, number] = [
            groupRef.current.position.x,
            groupRef.current.position.y,
            groupRef.current.position.z,
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
      {/* Agent Entity Crystal */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={agentColor}
          emissive={agentColor}
          emissiveIntensity={isSelected ? 1.5 : 0.8}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Status Orbital Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.6, 24]} />
        <meshBasicMaterial
          color={agentColor}
          transparent
          opacity={agent.status === "RUNNING" ? 0.9 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Point Light for Active Agents */}
      {agent.status === "RUNNING" && (
        <pointLight color={agentColor} intensity={1.8} distance={5} />
      )}
    </group>
  );
}
