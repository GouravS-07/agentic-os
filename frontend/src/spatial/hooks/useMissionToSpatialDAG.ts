/**
 * AGENTIC OS — useMissionToSpatialDAG
 * Bridges Mission/Task data → ELK layout → 3D world-space positions.
 *
 * Output is a stable list of positioned TaskBlock3D props and SpatialConduit3D props.
 * Layout is recomputed when tasks change (debounced to avoid thrash).
 * Scale factor maps ELK pixel units → Three.js metre units.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { Mission, Task } from "@/types";
import type { BackendTaskStatus } from "@/world/adapter/types";

// Use the broader adapter TaskStatus (includes BLOCKED, CANCELLED)
type TaskStatus = BackendTaskStatus;
import { computeMissionLayout } from "@/world/layout/layoutEngine";

// Scale factor: ELK layout pixels → Three.js metres
// ELK station width = 180px → 2.4m scene width (W in TaskBlock3D)
const SCALE = 2.4 / 180;

// Z-axis scale can differ (ELK height → scene depth)
const SCALE_Z = 1.4 / 58;

// Offset to centre the scene around the origin
function centreOffset(
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): [number, number] {
  return [
    -((bounds.minX + bounds.maxX) / 2) * SCALE,
    -((bounds.minY + bounds.maxY) / 2) * SCALE_Z,
  ];
}

export interface SpatialTaskNode {
  taskId: string;
  title: string;
  status: TaskStatus;
  position: [number, number, number];
  hasInputs: boolean;
  hasOutputs: boolean;
}

export interface SpatialConduitEdge {
  id: string;
  sourceId: string;
  targetId: string;
  start: [number, number, number];
  end: [number, number, number];
  status: "default" | "active" | "done" | "failed" | "blocked";
}

export interface SpatialDAGLayout {
  nodes: SpatialTaskNode[];
  edges: SpatialConduitEdge[];
  ready: boolean;
}

const EMPTY_LAYOUT: SpatialDAGLayout = { nodes: [], edges: [], ready: false };

// Module half-extents for socket positions
const BLOCK_W = 2.4;
const BLOCK_H_BASE = 0.08; // base plate height
const BLOCK_BODY_H = 0.44; // avg body height

function conduitStatus(
  sourceStatus: TaskStatus,
  targetStatus: TaskStatus
): SpatialConduitEdge["status"] {
  if (sourceStatus === "FAILED" || targetStatus === "FAILED") return "failed";
  if (sourceStatus === "RUNNING") return "active";
  if (sourceStatus === "COMPLETED") return "done";
  if (targetStatus === "BLOCKED") return "blocked";
  return "default";
}

export function useMissionToSpatialDAG(
  mission: Mission | null,
  tasks: Task[]
): SpatialDAGLayout {
  const [layout, setLayout] = useState<SpatialDAGLayout>(EMPTY_LAYOUT);
  const layoutGenRef = useRef(0);

  useEffect(() => {
    if (!mission || tasks.length === 0) {
      setLayout(EMPTY_LAYOUT);
      return;
    }

    const gen = ++layoutGenRef.current;

    computeMissionLayout(mission, tasks)
      .then((diagram) => {
        if (gen !== layoutGenRef.current) return; // stale, discard

        const [offX, offZ] = centreOffset(diagram.bounds);

        // Build task-to-position map
        const posMap = new Map<string, [number, number, number]>();
        const nodes: SpatialTaskNode[] = [];

        // Track which tasks have inputs/outputs
        const hasInputs = new Set<string>();
        const hasOutputs = new Set<string>();

        // Build dependency index
        tasks.forEach((t) => {
          (t.dependencies || []).forEach((depId) => {
            hasOutputs.add(depId);
            hasInputs.add(t.id);
          });
        });

        Object.values(diagram.stations).forEach((station) => {
          const task = tasks.find((t) => t.id === station.id);
          if (!task) return;

          // ELK gives top-left corner; centre of module:
          const cx = station.x * SCALE + offX;
          const cz = station.y * SCALE_Z + offZ;
          const pos: [number, number, number] = [cx, 0, cz];
          posMap.set(station.id, pos);

          nodes.push({
            taskId: task.id,
            title: task.title,
            status: task.status as TaskStatus,
            position: pos,
            hasInputs: hasInputs.has(task.id),
            hasOutputs: hasOutputs.has(task.id),
          });
        });

        // Build conduit edges
        const edges: SpatialConduitEdge[] = [];
        tasks.forEach((targetTask) => {
          (targetTask.dependencies || []).forEach((sourceId) => {
            const sourceTask = tasks.find((t) => t.id === sourceId);
            if (!sourceTask) return;

            const srcPos = posMap.get(sourceId);
            const dstPos = posMap.get(targetTask.id);
            if (!srcPos || !dstPos) return;

            const socketY = BLOCK_H_BASE + BLOCK_BODY_H * 0.5;

            edges.push({
              id: `${sourceId}→${targetTask.id}`,
              sourceId,
              targetId: targetTask.id,
              // Output socket on right face of source
              start: [srcPos[0] + BLOCK_W / 2, socketY, srcPos[2]],
              // Input socket on left face of target
              end: [dstPos[0] - BLOCK_W / 2, socketY, dstPos[2]],
              status: conduitStatus(
                sourceTask.status as TaskStatus,
                targetTask.status as TaskStatus
              ),
            });
          });
        });

        setLayout({ nodes, edges, ready: true });
      })
      .catch((err) => {
        console.error("[useMissionToSpatialDAG] Layout failed:", err);
        setLayout(EMPTY_LAYOUT);
      });
  }, [mission, tasks]);

  return layout;
}
