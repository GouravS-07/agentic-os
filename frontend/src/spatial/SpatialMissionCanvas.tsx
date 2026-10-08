/**
 * AGENTIC OS — SpatialMissionCanvas (Refined Phase B)
 * Main Three.js Canvas for the Spatial Mission Workspace.
 *
 * Visual improvements:
 * - Controlled dark charcoal/graphite foundation (#0e1017) with refined ground plate (#141620).
 * - FOV adjusted to 40° for optimal architectural telephoto perspective.
 * - Prominent TaskBlock3D and SpatialConduit3D nodes filling 60-75% of viewport.
 * - Dynamic camera distance adjustment based on DAG extent.
 * - Still when idle (frameloop="demand").
 */

"use client";

import React, { useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import type { SceneMission } from "@/world/adapter/types";
import { SpatialCameraRig } from "./SpatialCameraRig";
import { SpatialLighting } from "./SpatialLighting";
import { TaskBlock3D } from "./components/TaskBlock3D";
import { SpatialConduit3D } from "./components/SpatialConduit3D";
import { useSpatialMissionStore } from "./state/useSpatialMissionStore";
import { useSpatialLayout } from "./hooks/useSpatialLayout";

// Ground architectural computational plinth
function GroundPlate() {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Primary grounded chassis floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#11141e" roughness={0.88} metalness={0.15} />
      </mesh>
      {/* Structural panel datum tracks */}
      {[-8, -4, 0, 4, 8].map((offset, i) => (
        <group key={i}>
          <mesh position={[offset, 0.002, 0]}>
            <boxGeometry args={[0.02, 0.004, 80]} />
            <meshStandardMaterial color="#22283a" roughness={1} transparent opacity={0.25} />
          </mesh>
          <mesh position={[0, 0.002, offset]}>
            <boxGeometry args={[80, 0.004, 0.02]} />
            <meshStandardMaterial color="#22283a" roughness={1} transparent opacity={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Environmental datum line accents (very faint engineering axes)
function EnvironmentalDatums() {
  const datumColor = "#222636";
  return (
    <group position={[0, 0.002, 0]}>
      <mesh>
        <boxGeometry args={[50, 0.004, 0.03]} />
        <meshStandardMaterial
          color={datumColor}
          roughness={1}
          metalness={0}
          transparent
          opacity={0.12}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[0.03, 0.004, 50]} />
        <meshStandardMaterial
          color={datumColor}
          roughness={1}
          metalness={0}
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  );
}

function EmptySpatialWorkspace() {
  return (
    <group position={[0, 0.01, 0]}>
      <mesh>
        <boxGeometry args={[4.2, 0.012, 2.4]} />
        <meshStandardMaterial color="#1a1d28" roughness={0.92} metalness={0.08} />
      </mesh>
    </group>
  );
}

interface InnerSceneProps {
  sceneMission: SceneMission | null;
  selectedTaskId?: string | null;
  onStationSelect?: (stationId: string) => void;
}

function InnerScene({ sceneMission, selectedTaskId, onStationSelect }: InnerSceneProps) {
  const { stations, routes, ready, bounds } = useSpatialLayout(sceneMission);
  const selectedNodeId = useSpatialMissionStore((s) => s.selectedNodeId);
  const selectNode = useSpatialMissionStore((s) => s.selectNode);
  const setCameraTarget = useSpatialMissionStore((s) => s.setCameraTarget);

  // Automatically adjust camera distance to frame the DAG at 70-85% occupancy
  useEffect(() => {
    if (ready && stations.length > 0 && !selectedTaskId) {
      // Tuned for 38° FOV and ~16:9 container aspect ratio
      const widthReqDist = bounds.width > 0 ? bounds.width / 0.88 : 7.2;
      const heightReqDist = bounds.height > 0 ? bounds.height / 0.52 : 6.0;
      const calculatedDist = Math.max(7.0, Math.min(26.0, Math.max(widthReqDist, heightReqDist)));
      setCameraTarget([0, 0.28, 0], calculatedDist);
    }
  }, [ready, stations.length, bounds.width, bounds.height, selectedTaskId, setCameraTarget]);

  const handleStationSelect = useCallback(
    (stationId: string) => {
      const target = stations.find((s) => s.station.id === stationId);
      if (target) {
        const [x, , z] = target.position;
        selectNode(stationId);
        // Snappy focus zoom to selected module
        setCameraTarget([x, 0.32, z], 4.8);
      }
      onStationSelect?.(stationId);
    },
    [stations, selectNode, setCameraTarget, onStationSelect]
  );

  // Respond to prop-driven selection
  useEffect(() => {
    if (selectedTaskId && stations.length > 0) {
      handleStationSelect(selectedTaskId);
    }
  }, [selectedTaskId, stations, handleStationSelect]);

  // Expose global handler for automation/testing
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__selectSpatialTask = handleStationSelect;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__selectSpatialTask;
      }
    };
  }, [handleStationSelect]);

  return (
    <>
      <SpatialCameraRig />
      <SpatialLighting />
      <GroundPlate />
      <EnvironmentalDatums />

      {/* Task Compute Modules */}
      {ready &&
        stations.map(({ station, position, hasInputs, hasOutputs }) => (
          <TaskBlock3D
            key={station.id}
            station={station}
            position={position}
            hasInputs={hasInputs}
            hasOutputs={hasOutputs}
            isSelected={selectedNodeId === station.id}
            onSelect={handleStationSelect}
          />
        ))}

      {/* Dependency Conduits */}
      {ready &&
        routes.map(({ route, start, end }) => (
          <SpatialConduit3D
            key={route.id}
            route={route}
            start={start}
            end={end}
          />
        ))}

      {/* Standby Workspace Placeholder */}
      {(!ready || stations.length === 0) && <EmptySpatialWorkspace />}
    </>
  );
}

export interface SpatialMissionCanvasProps {
  sceneMission: SceneMission | null;
  selectedTaskId?: string | null;
  onStationSelect?: (stationId: string) => void;
  className?: string;
}

export function SpatialMissionCanvas({
  sceneMission,
  selectedTaskId,
  onStationSelect,
  className,
}: SpatialMissionCanvasProps) {
  return (
    <div
      className={className}
      style={{ background: "#0b0d13", width: "100%", height: "100%" }}
    >
      <Canvas
        frameloop="demand"
        shadows
        camera={{
          fov: 38, // Slightly tighter telephoto lens for architectural clarity
          near: 0.1,
          far: 250,
          position: [0, 9, 13],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ background: "#0b0d13" }}
      >
        <InnerScene
          sceneMission={sceneMission}
          selectedTaskId={selectedTaskId}
          onStationSelect={onStationSelect}
        />
      </Canvas>
    </div>
  );
}
