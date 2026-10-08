"use client";

import React from "react";
import * as THREE from "three";
import type { BackendTaskStatus } from "../../adapter/types.ts";

interface SignalSemaphore3DProps {
  position: [number, number, number];
  status: BackendTaskStatus;
  isRecovery?: boolean;
}

/**
 * 3D Precision Mechanical State Actuator
 * Machined steel post with brass pivot pin, articulated actuator arm,
 * mechanical counterweight, and micro optical indicator jewel.
 */
export const SignalSemaphore3D: React.FC<SignalSemaphore3DProps> = ({
  position,
  status,
  isRecovery = false,
}) => {
  let isArmLowered = false; // false = 0° horizontal (locked/holding); true = 45° downward (cleared)
  let lampColor = "#3A3A42";

  switch (status) {
    case "READY":
    case "COMPLETED":
      isArmLowered = true;
      lampColor = "#10B981";
      break;
    case "RUNNING":
      isArmLowered = true;
      lampColor = "#C98A2B";
      break;
    case "WAITING_APPROVAL":
      isArmLowered = false;
      lampColor = "#C98A2B";
      break;
    case "FAILED":
    case "BLOCKED":
      isArmLowered = false;
      lampColor = "#A63A32";
      break;
    case "PENDING":
    default:
      isArmLowered = false;
      lampColor = "#3A3A42";
      break;
  }

  const armRotationZ = isArmLowered ? -Math.PI / 4 : 0;

  return (
    <group position={position}>
      {/* 1. Machined Steel Post Column (#232328) */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 3.0, 8]} />
        <meshStandardMaterial color="#232328" roughness={0.6} metalness={0.6} />
      </mesh>

      {/* 2. Base Mounting Foot Flange with Hex Screws */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.2, 8]} />
        <meshStandardMaterial color="#161619" roughness={0.7} />
      </mesh>

      {/* 3. Actuator Gear Housing */}
      <mesh position={[0, 2.5, 0.15]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.5]} />
        <meshStandardMaterial color="#1A1A1E" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Brass Pivot Bushing */}
      <mesh position={[0, 2.7, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.2, 8]} />
        <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Optical Indicator Jewel Lens */}
      <mesh position={[0, 2.45, 0.42]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color={lampColor} />
      </mesh>

      {/* 4. Articulated Mechanical Actuator Arm */}
      <group position={[0, 2.7, 0.35]} rotation={[0, 0, armRotationZ]}>
        {/* Main Actuator Blade */}
        <mesh position={[0.75, 0, 0]} castShadow>
          <boxGeometry args={[1.5, 0.24, 0.08]} />
          <meshStandardMaterial
            color={isRecovery ? "#C98A2B" : status === "FAILED" ? "#A63A32" : "#E8E2D2"}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        {/* Mechanical Counterweight on Opposite Side */}
        <mesh position={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.45, 0.35, 0.14]} />
          <meshStandardMaterial color="#161619" metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
};
