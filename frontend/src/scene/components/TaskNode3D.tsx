"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SpatialTaskNode } from "../types";
import { useSceneStore } from "../state/useSceneStore";

const STATUS_COLOR_MAP: Record<string, string> = {
  PENDING: "#64748B",
  READY: "#06B6D4",
  RUNNING: "#6366F1",
  WAITING_APPROVAL: "#F59E0B",
  COMPLETED: "#10B981",
  FAILED: "#F43F5E",
  CANCELLED: "#475569",
};

interface TaskNode3DProps {
  node: SpatialTaskNode;
}

export function TaskNode3D({ node }: TaskNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const selectEntity = useSceneStore((s) => s.selectEntity);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const selectedEntity = useSceneStore((s) => s.selectedEntity);

  const isSelected = selectedEntity?.type === "TASK" && selectedEntity.id === node.id;
  const isRecovery = node.isRecovery;

  const hexColor = isRecovery ? "#A855F7" : (STATUS_COLOR_MAP[node.status] || "#64748B");
  const color = useMemo(() => new THREE.Color(hexColor), [hexColor]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.015;
    }
    if (glowRingRef.current && (node.status === "RUNNING" || isRecovery)) {
      const pulse = 1 + Math.sin(time * 3) * 0.15;
      glowRingRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group
      ref={groupRef}
      position={node.position}
      onClick={(e) => {
        e.stopPropagation();
        selectEntity({
          type: "TASK",
          id: node.id,
          data: { ...node, position: node.position },
        });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredEntity({ type: "TASK", id: node.id, data: node });
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoveredEntity(null);
        document.body.style.cursor = "auto";
      }}
    >
      {/* 3D Node Mesh */}
      <mesh ref={meshRef}>
        {isRecovery ? (
          <dodecahedronGeometry args={[0.42, 0]} />
        ) : (
          <boxGeometry args={[0.55, 0.55, 0.55]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.4 : node.status === "RUNNING" ? 0.9 : 0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Pulsing Outer Wireframe for Active / Recovery Nodes */}
      {(node.status === "RUNNING" || isRecovery || isSelected) && (
        <mesh ref={glowRingRef}>
          <boxGeometry args={[0.85, 0.85, 0.85]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
