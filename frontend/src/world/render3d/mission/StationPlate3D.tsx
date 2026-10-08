"use client";

import React, { useMemo, useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LayoutStation } from "../../layout/types.ts";
import { useWorldStore } from "../../state/worldStore";
import { SignalSemaphore3D } from "./SignalSemaphore3D";

interface StationPlate3DProps {
  station: LayoutStation;
  isSelected?: boolean;
  scale?: number;
}

function createCompactModuleLabelTexture(
  taskId: string,
  title: string,
  agent: string = "TASK",
  status: string = "READY",
  isRecovery: boolean = false,
  retryCount: number = 0
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.Texture() as unknown as THREE.CanvasTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Monospace Module ID & Agent Core Tag
    const modTag = taskId.length > 6 ? `MOD-${taskId.slice(0, 4).toUpperCase()}` : taskId;
    ctx.fillStyle = "#5A5964";
    ctx.font = `bold 28px "IBM Plex Mono", monospace`;
    ctx.fillText(isRecovery ? `[RECOVERY AUX // ${agent}]` : `[${modTag} // ${agent}]`, 40, 60);

    // 2. Compact Readable Title
    ctx.fillStyle = "#121214";
    ctx.font = `bold 38px "Archivo", "Barlow Condensed", sans-serif`;
    const shortTitle = title.length > 28 ? title.slice(0, 26) + "..." : title;
    ctx.fillText(shortTitle, 40, 138);

    // 3. Discrete Status & Attempt Metadata
    ctx.fillStyle =
      status === "FAILED"
        ? "#A63A32"
        : status === "RUNNING"
        ? "#C98A2B"
        : status === "COMPLETED"
        ? "#2B2B32"
        : "#6E6B75";
    ctx.font = `bold 24px "IBM Plex Mono", monospace`;
    const statusText = retryCount > 0 ? `${status} · ATTEMPTS: ${retryCount}` : status;
    ctx.fillText(`● ${statusText}`, 40, 218);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 3D Precision Execution Module (Task Station)
 * Compact industrial execution module with dark graphite chassis, machined aluminium perimeter,
 * ivory composite top plate, conductive terminal blocks, and living mechanical state actuators.
 */
export const StationPlate3D: React.FC<StationPlate3DProps> = ({
  station,
  isSelected = false,
  scale = 0.12,
}) => {
  const { openDocket, updateCameraPose } = useWorldStore();
  const { invalidate } = useThree();
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const escapementRef = useRef<THREE.Group>(null);
  const currentElev = useRef(0.1);

  const {
    id,
    title,
    status,
    agentType,
    assignedAgentId,
    x,
    y,
    width,
    height,
    isRecovery,
    attemptCount,
    description,
    lockPins,
  } = station;

  const plateWidth = width * scale * 0.85;
  const plateDepth = height * scale * 0.85;

  const labelTexture = useMemo(
    () =>
      createCompactModuleLabelTexture(
        id,
        title,
        agentType || "TASK",
        status,
        isRecovery,
        attemptCount
      ),
    [id, title, agentType, status, isRecovery, attemptCount]
  );

  const topPlateColor = isSelected
    ? "#F4EFE6"
    : isRecovery
    ? "#ECE5D8"
    : status === "FAILED"
    ? "#E8DFDE"
    : "#EAE4D6";

  useFrame((_, delta) => {
    // Dynamic Spring Elevation on hover or selection (settles and stops invalidating)
    const targetElev = isSelected ? 0.38 : isHovered ? 0.26 : 0.1;
    const diff = Math.abs(targetElev - currentElev.current);
    if (diff > 0.003) {
      currentElev.current += (targetElev - currentElev.current) * (delta * 8.0);
      if (groupRef.current) {
        groupRef.current.position.y = currentElev.current;
      }
      invalidate();
    }

    // Rotating micro-escapement spindle only while task is actively RUNNING
    if (escapementRef.current && status === "RUNNING") {
      escapementRef.current.rotation.y += delta * 4.5;
      invalidate();
    }
  });

  return (
    <group
      ref={groupRef}
      position={[x * scale, 0.1, y * scale]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={() => {
        setIsHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Swoop camera to intimate station perspective
        updateCameraPose({
          target: [x * scale + plateWidth / 2, 1.0, y * scale + plateDepth / 2],
          distance: 28,
          pitch: 22,
          yaw: -8,
        });
        openDocket({
          type: "STATION",
          id,
          title,
          meta: {
            status,
            agentType,
            assigned_agent: assignedAgentId,
            is_recovery: isRecovery,
            retry_count: attemptCount,
            description,
            dependencies: lockPins.map((p) => p.sourceTaskId),
          },
        });
      }}
    >
      {/* 1. Dark Metal Foundation Chassis Plate (#18181D) */}
      <mesh
        position={[plateWidth / 2, 0.2, plateDepth / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[plateWidth + 1.2, 0.4, plateDepth + 1.2]} />
        <meshStandardMaterial
          color="#18181D"
          roughness={0.65}
          metalness={0.45}
        />
      </mesh>

      {/* Machined Aluminium Bezel Frame (#7A787F) */}
      <mesh
        position={[plateWidth / 2, 0.42, plateDepth / 2]}
        castShadow
      >
        <boxGeometry args={[plateWidth + 0.4, 0.1, plateDepth + 0.4]} />
        <meshStandardMaterial
          color="#7A787F"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Corner Hex Mounting Bolts */}
      {[
        [-0.2, -0.2],
        [plateWidth + 0.2, -0.2],
        [-0.2, plateDepth + 0.2],
        [plateWidth + 0.2, plateDepth + 0.2],
      ].map(([bx, bz], i) => (
        <mesh key={`smb-${i}`} position={[bx, 0.48, bz]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 6]} />
          <meshStandardMaterial color="#B0AEA8" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      {/* 2. Top Chamfered Ivory Composite Insert Plate */}
      <mesh
        position={[plateWidth / 2, 0.48, plateDepth / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[plateWidth - 0.2, 0.16, plateDepth - 0.2]} />
        <meshStandardMaterial
          color={topPlateColor}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* 3. Top Printed Label Surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[plateWidth / 2, 0.58, plateDepth / 2]}
      >
        <planeGeometry args={[plateWidth * 0.9, plateDepth * 0.9]} />
        <meshBasicMaterial map={labelTexture} transparent opacity={0.95} />
      </mesh>

      {/* 4. Left Intake & Right Exhaust Conductive Terminal Blocks */}
      <group position={[-0.4, 0.35, plateDepth / 2]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.3, 2.4]} />
          <meshStandardMaterial color="#3A3A42" metalness={0.8} />
        </mesh>
        {/* Brass Terminal Contact Pins */}
        <mesh position={[-0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.15, 1.8]} />
          <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      <group position={[plateWidth + 0.4, 0.35, plateDepth / 2]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.3, 2.4]} />
          <meshStandardMaterial color="#3A3A42" metalness={0.8} />
        </mesh>
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.15, 1.8]} />
          <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 5. RUNNING: Precision Escapement Spindle & Amber Slide */}
      {status === "RUNNING" && (
        <group position={[plateWidth - 0.8, 0.62, 0.8]}>
          <group ref={escapementRef}>
            <mesh castShadow>
              <cylinderGeometry args={[0.45, 0.45, 0.18, 8]} />
              <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
          <mesh position={[-plateWidth / 2 + 0.8, 0, 0]} castShadow>
            <boxGeometry args={[plateWidth * 0.5, 0.08, 0.3]} />
            <meshBasicMaterial color="#C98A2B" />
          </mesh>
        </group>
      )}

      {/* 6. WAITING_APPROVAL: Physical Mechanical Interlocking Shutter Gate */}
      {status === "WAITING_APPROVAL" && (
        <group position={[-0.5, 0.75, plateDepth / 2]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.8, 2.8]} />
            <meshStandardMaterial color="#C98A2B" roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      )}

      {/* 7. FAILED: Mechanical Breaker Trip Arm & Hazard Red Tab */}
      {status === "FAILED" && (
        <group position={[0.3, 0.7, 0.3]}>
          <mesh castShadow rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.4, 0.25, plateDepth - 0.6]} />
            <meshStandardMaterial color="#A63A32" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      )}

      {/* 8. SIGNATURE REPLAN MOMENT: Auxiliary Recovery Module Unfolding */}
      {isRecovery && (
        <group position={[plateWidth / 2, -0.2, plateDepth + 1.6]}>
          {/* Telescoping Chassis Sub-Bay */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[plateWidth * 0.8, 0.35, 2.2]} />
            <meshStandardMaterial color="#232328" roughness={0.7} metalness={0.4} />
          </mesh>
          {/* Dual Brass Guide Rails connecting back to main chassis */}
          {[-plateWidth * 0.3, plateWidth * 0.3].map((rx, ri) => (
            <mesh key={`rec-rail-${ri}`} position={[rx, 0.1, -1.1]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 2.2, 8]} />
              <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
          {/* Amber Auxiliary State Core */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[plateWidth * 0.6, 0.1, 1.4]} />
            <meshStandardMaterial color="#C98A2B" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      )}

      {/* 9. Attached Precision Mechanical State Actuator */}
      <SignalSemaphore3D
        position={[-1.6, 0.1, plateDepth / 2]}
        status={status}
        isRecovery={isRecovery}
      />
    </group>
  );
};

