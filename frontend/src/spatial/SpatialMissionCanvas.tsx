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

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { SceneMission } from "@/world/adapter/types";
import { SpatialCameraRig } from "./SpatialCameraRig";
import { SpatialLighting } from "./SpatialLighting";
import { TaskBlock3D } from "./components/TaskBlock3D";
import { SpatialConduit3D } from "./components/SpatialConduit3D";
import { useSpatialMissionStore } from "./state/useSpatialMissionStore";
import { useSpatialLayout } from "./hooks/useSpatialLayout";

// Ground architectural computational plinth
function GroundPlate({ onGroundClick }: { onGroundClick?: () => void }) {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Primary grounded chassis floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onGroundClick?.();
        }}
      >
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
  onStationSelect?: (stationId: string | null) => void;
}

function InnerScene({ sceneMission, selectedTaskId, onStationSelect }: InnerSceneProps) {
  const { stations, routes, ready, bounds } = useSpatialLayout(sceneMission);
  const selectedNodeId = useSpatialMissionStore((s) => s.selectedNodeId);
  const cameraMode = useSpatialMissionStore((s) => s.cameraMode);
  const selectNode = useSpatialMissionStore((s) => s.selectNode);
  const setCameraMode = useSpatialMissionStore((s) => s.setCameraMode);
  const setCameraTarget = useSpatialMissionStore((s) => s.setCameraTarget);
  const resetCamera = useSpatialMissionStore((s) => s.resetCamera);

  // ── Graph Context Resolution ──
  // Identifies immediate prerequisites (unlockers) and dependents (unlocked)
  const { prerequisites, dependents, incomingRouteIds, outgoingRouteIds } = useMemo(() => {
    if (!selectedNodeId || !sceneMission) {
      return {
        prerequisites: new Set<string>(),
        dependents: new Set<string>(),
        incomingRouteIds: new Set<string>(),
        outgoingRouteIds: new Set<string>(),
      };
    }

    const prereqs = new Set<string>();
    const deps = new Set<string>();
    const inRoutes = new Set<string>();
    const outRoutes = new Set<string>();

    sceneMission.routes.forEach((r) => {
      if (r.targetStationId === selectedNodeId) {
        prereqs.add(r.sourceStationId);
        inRoutes.add(r.id);
      }
      if (r.sourceStationId === selectedNodeId) {
        deps.add(r.targetStationId);
        outRoutes.add(r.id);
      }
    });

    return {
      prerequisites: prereqs,
      dependents: deps,
      incomingRouteIds: inRoutes,
      outgoingRouteIds: outRoutes,
    };
  }, [selectedNodeId, sceneMission]);

  // ── Authored Camera Pose Generators ──

  // 1. Mission Overview: Frame entire DAG at comfortable architectural overview
  const getOverviewPose = useCallback(() => {
    const widthReqDist = bounds.width > 0 ? bounds.width / 0.88 : 7.2;
    const heightReqDist = bounds.height > 0 ? bounds.height / 0.52 : 6.0;
    const distance = Math.max(7.0, Math.min(26.0, Math.max(widthReqDist, heightReqDist)));
    return {
      target: [0, 0.28, 0] as [number, number, number],
      distance,
      pitch: (30 * Math.PI) / 180,
      yaw: (-14 * Math.PI) / 180,
    };
  }, [bounds]);

  // 2. Task Focus: Authored 3/4 angle where selected module dominates
  const getTaskFocusPose = useCallback(
    (stationId: string) => {
      const targetStation = stations.find((s) => s.station.id === stationId);
      if (!targetStation) return null;
      const [x, , z] = targetStation.position;
      return {
        target: [x, 0.35, z] as [number, number, number],
        distance: 4.8,
        pitch: (32 * Math.PI) / 180,
        yaw: (-18 * Math.PI) / 180,
      };
    },
    [stations]
  );

  // 3. Dependency Focus: Frames selected task + prerequisite & dependent chain
  const getDependencyFocusPose = useCallback(
    (stationId: string) => {
      const selected = stations.find((s) => s.station.id === stationId);
      if (!selected) return null;

      const relatedIds = new Set([
        stationId,
        ...Array.from(prerequisites),
        ...Array.from(dependents),
      ]);
      const cluster = stations.filter((s) => relatedIds.has(s.station.id));
      if (cluster.length === 0) return null;

      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      cluster.forEach((c) => {
        const [cx, , cz] = c.position;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minZ = Math.min(minZ, cz);
        maxZ = Math.max(maxZ, cz);
      });

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const spanX = maxX - minX + 4.2;
      const spanZ = maxZ - minZ + 3.2;
      const span = Math.max(spanX / 0.82, spanZ / 0.52);
      const distance = Math.max(6.2, Math.min(18.0, span));

      return {
        target: [centerX, 0.32, centerZ] as [number, number, number],
        distance,
        pitch: (33 * Math.PI) / 180,
        yaw: (-14 * Math.PI) / 180,
      };
    },
    [stations, prerequisites, dependents]
  );

  // Automatically initialize overview when layout is ready
  useEffect(() => {
    if (ready && stations.length > 0 && !selectedTaskId && !selectedNodeId) {
      const overview = getOverviewPose();
      setCameraTarget(overview.target, overview.distance, overview.pitch, overview.yaw);
    }
  }, [ready, stations.length, selectedTaskId, selectedNodeId, getOverviewPose, setCameraTarget]);

  // Handle station selection
  const handleStationSelect = useCallback(
    (stationId: string | null) => {
      if (!stationId) {
        selectNode(null);
        const overview = getOverviewPose();
        setCameraTarget(overview.target, overview.distance, overview.pitch, overview.yaw);
        onStationSelect?.(null);
        return;
      }

      selectNode(stationId);
      const focusPose = getTaskFocusPose(stationId);
      if (focusPose) {
        setCameraTarget(focusPose.target, focusPose.distance, focusPose.pitch, focusPose.yaw);
      }
      onStationSelect?.(stationId);
    },
    [selectNode, getOverviewPose, getTaskFocusPose, setCameraTarget, onStationSelect]
  );

  // Handle camera mode change
  useEffect(() => {
    if (!ready || stations.length === 0) return;

    if (cameraMode === "OVERVIEW") {
      const overview = getOverviewPose();
      setCameraTarget(overview.target, overview.distance, overview.pitch, overview.yaw);
    } else if (cameraMode === "TASK_FOCUS" && selectedNodeId) {
      const taskPose = getTaskFocusPose(selectedNodeId);
      if (taskPose) {
        setCameraTarget(taskPose.target, taskPose.distance, taskPose.pitch, taskPose.yaw);
      }
    } else if (cameraMode === "DEPENDENCY_FOCUS" && selectedNodeId) {
      const depPose = getDependencyFocusPose(selectedNodeId);
      if (depPose) {
        setCameraTarget(depPose.target, depPose.distance, depPose.pitch, depPose.yaw);
      }
    }
  }, [cameraMode, selectedNodeId, ready, stations.length, getOverviewPose, getTaskFocusPose, getDependencyFocusPose, setCameraTarget]);

  // Respond to prop-driven selection (from 2D DAG or parent page)
  const prevPropTaskId = useRef(selectedTaskId);
  useEffect(() => {
    if (selectedTaskId !== prevPropTaskId.current) {
      prevPropTaskId.current = selectedTaskId;
      if (selectedTaskId && stations.length > 0) {
        handleStationSelect(selectedTaskId);
      } else if (!selectedTaskId && selectedNodeId) {
        handleStationSelect(null);
      }
    }
  }, [selectedTaskId, selectedNodeId, stations.length, handleStationSelect]);

  // Expose global handlers for automated test suites
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__selectSpatialTask = (id: string | null) => handleStationSelect(id);
      (window as any).__setSpatialCameraMode = (mode: any) => setCameraMode(mode);
      (window as any).__clearSpatialSelection = () => handleStationSelect(null);
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__selectSpatialTask;
        delete (window as any).__setSpatialCameraMode;
        delete (window as any).__clearSpatialSelection;
      }
    };
  }, [handleStationSelect, setCameraMode]);

  return (
    <>
      <SpatialCameraRig />
      <SpatialLighting />
      <GroundPlate onGroundClick={() => handleStationSelect(null)} />
      <EnvironmentalDatums />

      {/* Task Compute Modules */}
      {ready &&
        stations.map(({ station, position, hasInputs, hasOutputs }) => {
          const isSelected = selectedNodeId === station.id;
          const isPrereq = prerequisites.has(station.id);
          const isDep = dependents.has(station.id);
          const isDimmed = !!selectedNodeId && !isSelected && !isPrereq && !isDep;

          return (
            <TaskBlock3D
              key={station.id}
              station={station}
              position={position}
              hasInputs={hasInputs}
              hasOutputs={hasOutputs}
              isSelected={isSelected}
              isPrerequisite={isPrereq}
              isDependent={isDep}
              isDimmed={isDimmed}
              onSelect={handleStationSelect}
            />
          );
        })}

      {/* Dependency Conduits */}
      {ready &&
        routes.map(({ route, start, end }) => {
          const isSelectedRoute = incomingRouteIds.has(route.id);
          const isDownstreamRoute = outgoingRouteIds.has(route.id);
          const isDimmed = !!selectedNodeId && !isSelectedRoute && !isDownstreamRoute;

          return (
            <SpatialConduit3D
              key={route.id}
              route={route}
              start={start}
              end={end}
              isSelectedRoute={isSelectedRoute}
              isDownstreamRoute={isDownstreamRoute}
              isDimmed={isDimmed}
            />
          );
        })}

      {/* Standby Workspace Placeholder */}
      {(!ready || stations.length === 0) && <EmptySpatialWorkspace />}
    </>
  );
}

export interface SpatialMissionCanvasProps {
  sceneMission: SceneMission | null;
  selectedTaskId?: string | null;
  onStationSelect?: (stationId: string | null) => void;
  className?: string;
}

export function SpatialMissionCanvas({
  sceneMission,
  selectedTaskId,
  onStationSelect,
  className,
}: SpatialMissionCanvasProps) {
  const cameraMode = useSpatialMissionStore((s) => s.cameraMode);
  const selectedNodeId = useSpatialMissionStore((s) => s.selectedNodeId);
  const setCameraMode = useSpatialMissionStore((s) => s.setCameraMode);
  const selectNode = useSpatialMissionStore((s) => s.selectNode);

  return (
    <div
      className={className}
      style={{ background: "#0b0d13", width: "100%", height: "100%", position: "relative" }}
    >
      {/* ── Authored Camera Mode HUD Pills ── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-lg p-1 text-[10px] font-mono select-none shadow-xl">
        <button
          onClick={() => setCameraMode("OVERVIEW")}
          className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1.5 ${
            cameraMode === "OVERVIEW"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
          title="Mission Overview (Full DAG readable)"
        >
          <span>MISSION OVERVIEW</span>
        </button>

        <button
          onClick={() => selectedNodeId && setCameraMode("TASK_FOCUS")}
          disabled={!selectedNodeId}
          className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1.5 ${
            cameraMode === "TASK_FOCUS"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : selectedNodeId
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              : "text-slate-600 cursor-not-allowed opacity-50"
          }`}
          title={selectedNodeId ? "Task Focus (Selected module dominates)" : "Select a task module first"}
        >
          <span>TASK FOCUS</span>
        </button>

        <button
          onClick={() => selectedNodeId && setCameraMode("DEPENDENCY_FOCUS")}
          disabled={!selectedNodeId}
          className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1.5 ${
            cameraMode === "DEPENDENCY_FOCUS"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : selectedNodeId
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              : "text-slate-600 cursor-not-allowed opacity-50"
          }`}
          title={selectedNodeId ? "Dependency Focus (Prerequisites & dependents chain)" : "Select a task module first"}
        >
          <span>DEPENDENCY FOCUS</span>
        </button>
      </div>

      <Canvas
        frameloop="demand"
        shadows
        camera={{
          fov: 38,
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
