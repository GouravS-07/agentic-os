/**
 * AGENTIC OS — SpatialMissionCanvas
 * The primary Three.js Canvas for the Spatial Mission Workspace.
 *
 * Phase A + Phase B:
 * - frameloop="demand": canvas sleeps when idle
 * - SpatialCameraRig: spring camera, only animates on focus
 * - SpatialLighting: restrained dark studio lighting
 * - TaskBlock3D: compute module per task
 * - SpatialConduit3D: physical conduit per dependency
 * - Ground plane: very subtle dark surface (NOT a grid)
 * - Background: near-black #060608
 *
 * Motion rules:
 * - Idle = completely still
 * - Motion only from: user click, user hover, real backend state change
 */

"use client";

import React, { useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Mission, Task } from "@/types";
import { SpatialCameraRig } from "./SpatialCameraRig";
import { SpatialLighting } from "./SpatialLighting";
import { TaskBlock3D } from "./components/TaskBlock3D";
import { SpatialConduit3D } from "./components/SpatialConduit3D";
import { useSpatialMissionStore } from "./state/useSpatialMissionStore";
import { useMissionToSpatialDAG } from "./hooks/useMissionToSpatialDAG";

// ─── Ground plane ──────────────────────────────────────────────────────────────
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial
        color="#09090b"
        roughness={0.98}
        metalness={0.0}
      />
    </mesh>
  );
}

// ─── Subtle depth reference marks (NOT a grid — just faint anchor lines) ──────
function DepthReferenceMarks() {
  // Very faint orthogonal marks at the origin — not a full grid
  // Opacity kept at 0.04 maximum
  const lineColor = "#1a1a22";
  return (
    <group position={[0, 0.001, 0]}>
      {/* Centre cross — X axis */}
      <mesh>
        <boxGeometry args={[30, 0.004, 0.015]} />
        <meshStandardMaterial color={lineColor} roughness={1} metalness={0} transparent opacity={0.04} />
      </mesh>
      {/* Centre cross — Z axis */}
      <mesh>
        <boxGeometry args={[0.015, 0.004, 30]} />
        <meshStandardMaterial color={lineColor} roughness={1} metalness={0} transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

// ─── Empty state placeholder ───────────────────────────────────────────────────
function EmptyScenePlaceholder() {
  return (
    <group>
      {/* Subtle base marker indicating where tasks will appear */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[3, 0.006, 1.6]} />
        <meshStandardMaterial color="#14141a" roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  );
}

// ─── Inner scene (rendered inside Canvas context) ──────────────────────────────
interface InnerSceneProps {
  mission: Mission | null;
  tasks: Task[];
  onTaskSelect?: (taskId: string) => void;
}

function InnerScene({ mission, tasks, onTaskSelect }: InnerSceneProps) {
  const dagLayout = useMissionToSpatialDAG(mission, tasks);
  const selectNode = useSpatialMissionStore((s) => s.selectNode);
  const setCameraTarget = useSpatialMissionStore((s) => s.setCameraTarget);

  const handleTaskSelect = useCallback(
    (taskId: string) => {
      // Find node position for camera focus
      const node = dagLayout.nodes.find((n) => n.taskId === taskId);
      if (node) {
        const [x, , z] = node.position;
        selectNode(taskId);
        setCameraTarget([x, 0, z], 7);
      }
      onTaskSelect?.(taskId);
    },
    [dagLayout.nodes, selectNode, setCameraTarget, onTaskSelect]
  );

  return (
    <>
      <SpatialCameraRig />
      <SpatialLighting />
      <GroundPlane />
      <DepthReferenceMarks />

      {/* Task modules */}
      {dagLayout.ready &&
        dagLayout.nodes.map((node) => (
          <TaskBlock3D
            key={node.taskId}
            taskId={node.taskId}
            title={node.title}
            status={node.status}
            position={node.position}
            hasInputs={node.hasInputs}
            hasOutputs={node.hasOutputs}
            onSelect={handleTaskSelect}
          />
        ))}

      {/* Dependency conduits */}
      {dagLayout.ready &&
        dagLayout.edges.map((edge) => (
          <SpatialConduit3D
            key={edge.id}
            start={edge.start}
            end={edge.end}
            status={edge.status}
          />
        ))}

      {/* Empty state */}
      {(!dagLayout.ready || dagLayout.nodes.length === 0) && (
        <EmptyScenePlaceholder />
      )}
    </>
  );
}

// ─── Canvas component (public API) ────────────────────────────────────────────
export interface SpatialMissionCanvasProps {
  mission: Mission | null;
  tasks: Task[];
  /** Optional callback when a task is selected in the spatial view */
  onTaskSelect?: (taskId: string) => void;
  className?: string;
}

export function SpatialMissionCanvas({
  mission,
  tasks,
  onTaskSelect,
  className,
}: SpatialMissionCanvasProps) {
  return (
    <div
      className={className}
      style={{ background: "#060608", width: "100%", height: "100%" }}
    >
      <Canvas
        frameloop="demand"
        shadows
        camera={{
          fov: 48,
          near: 0.1,
          far: 200,
          position: [0, 14, 18],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ background: "#060608" }}
      >
        <InnerScene
          mission={mission}
          tasks={tasks}
          onTaskSelect={onTaskSelect}
        />
      </Canvas>
    </div>
  );
}
