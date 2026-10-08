/**
 * AGENTIC OS — INTERLOCKING LAYOUT ENGINE (ELK Layered + Chamfered Routing)
 * Computes deterministic orthogonal spatial positions for DAG stations and track routes.
 * STRICT RULE: Separation of concerns — Reconcile is data/state; Layout is spatial geometry.
 */

import ELK from "elkjs/lib/elk.bundled.js";
import type { Task, Mission } from "@/types";
import type { SceneMission, SceneStation } from "../adapter/types.ts";
import type {
  Point2D,
  LayoutStation,
  LayoutTrack,
  LayoutLockPlate,
  MissionDiagramLayout,
  IncomingLockPin,
} from "./types.ts";
import { pointsToSvgPath } from "./chamfer.ts";

const elk = new ELK();

const STATION_WIDTH = 180;
const STATION_HEIGHT = 58;
const LOCK_PLATE_WIDTH = 18;

// Caches previous positions for incremental replanning stabilization
const stationPositionCache = new Map<string, { x: number; y: number }>();

export interface LayoutOptions {
  preservePreviousPositions?: boolean;
  padding?: number;
}

/**
 * Computes the complete spatial layout of a Mission DAG using ELK.
 */
export async function computeMissionLayout(
  mission: Mission | SceneMission,
  tasks: (Task | SceneStation)[],
  options: LayoutOptions = {}
): Promise<MissionDiagramLayout> {
  if (!tasks || tasks.length === 0) {
    return {
      missionId: mission.id,
      title: mission.title || "Untitled Mission",
      description: "description" in mission ? mission.description : undefined,
      status: mission.status,
      planVersion: "plan_version" in mission ? mission.plan_version : ("planVersion" in mission ? (mission as any).planVersion : 1),
      replanCount: "replan_count" in mission ? mission.replan_count : ("replanCount" in mission ? (mission as any).replanCount : 0),
      bounds: { minX: 0, minY: 0, maxX: 400, maxY: 200, width: 400, height: 200 },
      stations: {},
      tracks: [],
      lockPlates: {},
    };
  }

  // 1. Build map of tasks
  const taskMap = new Map<string, any>();
  const incomingDeps = new Map<string, string[]>();

  tasks.forEach((t) => {
    taskMap.set(t.id, t);
    incomingDeps.set(t.id, []);
  });

  // Collect dependencies
  tasks.forEach((t) => {
    const deps =
      "incomingPrerequisites" in t
        ? (t as any).incomingPrerequisites
        : "dependencies" in t
        ? (t as any).dependencies
        : (t as any).depends_on;
    if (Array.isArray(deps)) {
      deps.forEach((dep: any) => {
        const depId = typeof dep === "string" ? dep : (dep.dependency_task_id || dep.id);
        if (depId && taskMap.has(depId)) {
          const list = incomingDeps.get(t.id) || [];
          if (!list.includes(depId)) {
            list.push(depId);
            incomingDeps.set(t.id, list);
          }
        }
      });
    }
  });

  // 2. Prepare ELK graph structure
  const elkNodes: any[] = [];
  const elkEdges: any[] = [];

  tasks.forEach((t) => {
    const prereqCount = (incomingDeps.get(t.id) || []).length;
    const isMultiPrereq = prereqCount >= 2;
    // Multi-prereq stations have an extra entrance lock plate
    const totalWidth = isMultiPrereq ? STATION_WIDTH + LOCK_PLATE_WIDTH : STATION_WIDTH;

    elkNodes.push({
      id: t.id,
      width: totalWidth,
      height: STATION_HEIGHT,
      layoutOptions: {
        "elk.portConstraints": "FIXED_SIDE",
      },
    });
  });

  let edgeCounter = 0;
  tasks.forEach((t) => {
    const prereqs = incomingDeps.get(t.id) || [];
    prereqs.forEach((sourceId) => {
      edgeCounter++;
      elkEdges.push({
        id: `e_${sourceId}_${t.id}_${edgeCounter}`,
        sources: [sourceId],
        targets: [t.id],
      });
    });
  });

  const pad = options.padding ?? 60;

  const elkGraph = {
    id: `mission_${mission.id}`,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "44",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.padding": `[top=${pad},left=${pad},bottom=${pad},right=${pad}]`,
    },
    children: elkNodes,
    edges: elkEdges,
  };

  // 3. Execute ELK layout
  const layouted = await elk.layout(elkGraph);

  // 4. Construct Layout Stations, Lock Plates, and Pins
  const stations: Record<string, LayoutStation> = {};
  const lockPlates: Record<string, LayoutLockPlate> = {};

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  (layouted.children || []).forEach((child: any) => {
    const t = taskMap.get(child.id);
    if (!t) return;

    const prereqIds = incomingDeps.get(t.id) || [];
    const isMultiPrereq = prereqIds.length >= 2;

    const x = child.x || 0;
    const y = child.y || 0;
    const width = STATION_WIDTH;
    const height = STATION_HEIGHT;

    // Station bounding box tracking
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + child.width);
    maxY = Math.max(maxY, y + height);

    // Build lock pins for multi-prerequisite junction
    const lockPins: IncomingLockPin[] = [];
    let allPrereqsSatisfied = true;

    prereqIds.forEach((sourceId, index) => {
      const sourceTask = taskMap.get(sourceId);
      const isSatisfied = sourceTask ? sourceTask.status === "COMPLETED" : false;
      if (!isSatisfied) {
        allPrereqsSatisfied = false;
      }

      // Distribute pin slots evenly vertically
      const pinY = y + ((index + 1) * height) / (prereqIds.length + 1);
      lockPins.push({
        sourceTaskId: sourceId,
        sourceTaskTitle: sourceTask?.title || sourceId,
        isSatisfied,
        pinY,
      });
    });

    if (isMultiPrereq) {
      lockPlates[t.id] = {
        stationId: t.id,
        x: x,
        y: y,
        width: LOCK_PLATE_WIDTH,
        height,
        allSatisfied: allPrereqsSatisfied,
        pins: lockPins,
      };
    }

    const stationX = isMultiPrereq ? x + LOCK_PLATE_WIDTH : x;

    // Cache position for replanning stabilization
    stationPositionCache.set(t.id, { x: stationX, y });

    const status = (t as any).state || (t as any).status || "PENDING";
    const isRecovery = Boolean(
      (t as any).isRecovery ||
      (t as any).is_recovery ||
      t.title?.toLowerCase().includes("recovery") ||
      t.title?.toLowerCase().includes("remediation")
    );

    stations[t.id] = {
      id: t.id,
      missionId: mission.id,
      title: t.title || t.id,
      status,
      agentType: (t as any).agentType || (t as any).assigned_agent_type || (t as any).assignedAgentId || "TASK",
      assignedAgentId: (t as any).assignedAgentId || (t as any).assigned_agent_id || (t as any).assigned_agent,
      x: stationX,
      y,
      width,
      height,
      layer: 0,
      isRecovery,
      isMultiPrereq,
      lockPins,
      allPrereqsSatisfied,
      attemptCount: (t as any).retryCount || (t as any).retry_count || (t as any).attempt_count || 0,
      failureCategory: (t as any).errorMessage || (t as any).failure_category || (t as any).error_type,
      description: t.description,
    };
  });

  // 5. Construct Layout Tracks with Chamfers
  const tracks: LayoutTrack[] = [];

  (layouted.edges || []).forEach((edge: any) => {
    const sourceId = edge.sources[0];
    const targetId = edge.targets[0];
    const sourceStation = stations[sourceId];
    const targetStation = stations[targetId];

    if (!sourceStation || !targetStation) return;

    const sections = edge.sections || [];
    if (sections.length === 0) return;

    const sec = sections[0];
    const rawPoints: Point2D[] = [];

    // Start point at right edge of source station
    rawPoints.push({
      x: sourceStation.x + sourceStation.width,
      y: sec.startPoint ? sec.startPoint.y : sourceStation.y + sourceStation.height / 2,
    });

    // Intermediate bend points
    if (sec.bendPoints && Array.isArray(sec.bendPoints)) {
      sec.bendPoints.forEach((bp: any) => {
        rawPoints.push({ x: bp.x, y: bp.y });
      });
    }

    // End point at left edge of target (or entrance lock plate pin)
    let endY = sec.endPoint ? sec.endPoint.y : targetStation.y + targetStation.height / 2;
    let endX = targetStation.x;

    // Connect to specific lock pin if multi-prereq
    if (targetStation.isMultiPrereq) {
      endX = targetStation.x - LOCK_PLATE_WIDTH;
      const matchingPin = targetStation.lockPins.find((p) => p.sourceTaskId === sourceId);
      if (matchingPin) {
        endY = matchingPin.pinY;
      }
    }

    rawPoints.push({ x: endX, y: endY });

    // Track status derivation
    let status: LayoutTrack["status"] = "PENDING";
    if (sourceStation.status === "FAILED") {
      status = "FAILED";
    } else if (sourceStation.status === "COMPLETED" && targetStation.status === "RUNNING") {
      status = "RUNNING";
    } else if (sourceStation.status === "COMPLETED" && targetStation.status === "READY") {
      status = "READY";
    } else if (sourceStation.status === "COMPLETED") {
      status = "COMPLETED";
    }

    const svgPath = pointsToSvgPath(rawPoints, 8.0);
    const isRecovery = sourceStation.isRecovery || targetStation.isRecovery;

    tracks.push({
      id: edge.id,
      sourceTaskId: sourceId,
      targetTaskId: targetId,
      status,
      points: rawPoints,
      svgPath,
      isRecovery,
      hasGapOnFailure: sourceStation.status === "FAILED",
    });
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 600;
    maxY = 300;
  }

  const paddingBounds = 40;
  const bounds = {
    minX: minX - paddingBounds,
    minY: minY - paddingBounds,
    maxX: maxX + paddingBounds,
    maxY: maxY + paddingBounds,
    width: maxX - minX + paddingBounds * 2,
    height: maxY - minY + paddingBounds * 2,
  };

  const planVersion = "plan_version" in mission ? mission.plan_version : ("planVersion" in mission ? (mission as any).planVersion : 1);
  const replanCount = "replan_count" in mission ? mission.replan_count : ("replanCount" in mission ? (mission as any).replanCount : 0);

  return {
    missionId: mission.id,
    title: mission.title || "Untitled Mission",
    description: "description" in mission ? mission.description : undefined,
    status: mission.status,
    planVersion: planVersion || 1,
    replanCount: replanCount || 0,
    bounds,
    stations,
    tracks,
    lockPlates,
  };
}
