"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useWorldStore } from "../../state/worldStore";
import type { MissionDiagramLayout } from "../../layout/types.ts";
import { computeMissionLayout } from "../../layout/layoutEngine.ts";
import { StationPlate3D } from "./StationPlate3D";
import { TrackRoute3D } from "./TrackRoute3D";
import { JunctionLock3D } from "./JunctionLock3D";

function createSheetHeaderTexture(
  title: string,
  status: string,
  planVersion: number = 1,
  replanCount: number = 0
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.Texture() as unknown as THREE.CanvasTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 140;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Goal tag
    ctx.fillStyle = "#6E6D78";
    ctx.font = `bold 22px "IBM Plex Mono", monospace`;
    ctx.fillText(`EXECUTION SURFACE // PLAN v${planVersion}${replanCount > 0 ? ` (REPLANS: ${replanCount})` : ""}`, 30, 40);

    // Mission Title
    ctx.fillStyle = "#121214";
    ctx.font = `bold 36px "Archivo", "Barlow Condensed", sans-serif`;
    ctx.fillText(title, 30, 95);

    // Status Pill
    ctx.fillStyle = status === "RUNNING" ? "#C98A2B" : status === "COMPLETED" ? "#121214" : "#A63A32";
    ctx.font = `bold 22px "IBM Plex Mono", monospace`;
    ctx.fillText(`[${status}]`, canvas.width - 220, 95);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 3D Physical Execution Surface (Mission Sheet)
 * Raised ivory composite plate with dark graphite carrier frame,
 * peripheral mounting clamps, and compact datum labeling.
 */
export const MissionSheet3D: React.FC = () => {
  const { activeMissionId, sceneModel } = useWorldStore();
  const [layout, setLayout] = useState<MissionDiagramLayout | null>(null);

  const activeMission = activeMissionId ? sceneModel.missions[activeMissionId] : null;

  // Compute 3D DAG layout using the authoritative layout engine
  useEffect(() => {
    if (!activeMission) {
      setLayout(null);
      return;
    }

    let isCancelled = false;
    computeMissionLayout(activeMission, activeMission.stations, { preservePreviousPositions: true })
      .then((res) => {
        if (!isCancelled) setLayout(res);
      })
      .catch((err) => {
        console.error("3D Layout calculation error:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeMission]);

  const scale = 0.12;

  const sheetHeaderTexture = useMemo(() => {
    if (!activeMission) return null;
    return createSheetHeaderTexture(
      activeMission.title,
      activeMission.status,
      activeMission.planVersion,
      activeMission.replanCount
    );
  }, [activeMission]);

  if (!activeMission || !layout) return null;

  const sheetWidth = Math.max(layout.bounds.width * scale + 16, 84);
  const sheetDepth = Math.max(layout.bounds.height * scale + 16, 52);

  return (
    <group
      name="mission-execution-surface"
      position={[-70, 0.25, 0]}
      rotation={[0, 0, 0]}
    >
      {/* 1. Dark Graphite Foundation Carrier Plate (#18181D) */}
      <mesh position={[sheetWidth / 2 - 10, 0.08, sheetDepth / 2 - 10]} castShadow receiveShadow>
        <boxGeometry args={[sheetWidth + 2.5, 0.25, sheetDepth + 2.5]} />
        <meshStandardMaterial
          color="#18181D"
          roughness={0.7}
          metalness={0.4}
        />
      </mesh>

      {/* Machined Aluminium Outer Frame Trim (#7A787F) */}
      <mesh position={[sheetWidth / 2 - 10, 0.22, sheetDepth / 2 - 10]} castShadow>
        <boxGeometry args={[sheetWidth + 0.8, 0.1, sheetDepth + 0.8]} />
        <meshStandardMaterial color="#7A787F" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 2. Raised Ivory Composite Execution Bed Plate (#EFE9DC) */}
      <mesh position={[sheetWidth / 2 - 10, 0.26, sheetDepth / 2 - 10]} castShadow receiveShadow>
        <boxGeometry args={[sheetWidth, 0.2, sheetDepth]} />
        <meshStandardMaterial
          color="#EFE9DC"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* 3. Printed Header Plate on Execution Surface */}
      {sheetHeaderTexture && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[sheetWidth / 2 - 10, 0.38, -1.5]}
        >
          <planeGeometry args={[sheetWidth * 0.94, 8.5]} />
          <meshBasicMaterial map={sheetHeaderTexture} transparent opacity={0.92} />
        </mesh>
      )}

      {/* 4. 3D Interlocking Data Conduits */}
      <group name="3d-conduits" position={[0, 0.36, 6]}>
        {layout.tracks.map((track) => (
          <TrackRoute3D key={track.id} track={track} scale={scale} />
        ))}
      </group>

      {/* 5. 3D Multi-Prerequisite Dependency Interlocks */}
      <group name="3d-interlocks" position={[0, 0.36, 6]}>
        {Object.values(layout.lockPlates).map((lp) => (
          <JunctionLock3D key={`lock-${lp.stationId}`} lockPlate={lp} scale={scale} />
        ))}
      </group>

      {/* 6. 3D DAG Execution Modules & Attached Actuators */}
      <group name="3d-execution-modules" position={[0, 0.36, 6]}>
        {Object.values(layout.stations).map((station) => (
          <StationPlate3D
            key={station.id}
            station={station}
            scale={scale}
          />
        ))}
      </group>
    </group>
  );
};
