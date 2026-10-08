/**
 * AGENTIC OS — INTERLOCKING LAYOUT TYPES (Pure TypeScript)
 * Spatial positioning data contracts for DAG stations, chamfered tracks, signals, and lock plates.
 */

import type { BackendTaskStatus, BackendAgentType } from "../adapter/types.ts";

export interface Point2D {
  x: number;
  y: number;
}

export interface IncomingLockPin {
  sourceTaskId: string;
  sourceTaskTitle: string;
  isSatisfied: boolean;
  pinY: number;
}

export interface LayoutStation {
  id: string;
  missionId: string;
  title: string;
  status: BackendTaskStatus;
  agentType?: BackendAgentType;
  assignedAgentId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  isRecovery: boolean;
  isMultiPrereq: boolean;
  lockPins: IncomingLockPin[];
  allPrereqsSatisfied: boolean;
  attemptCount: number;
  failureCategory?: string;
  description?: string;
}

export interface LayoutTrack {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  status: "PENDING" | "READY" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
  points: Point2D[];
  svgPath: string;
  isRecovery: boolean;
  hasGapOnFailure: boolean;
}

export interface LayoutLockPlate {
  stationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  allSatisfied: boolean;
  pins: IncomingLockPin[];
}

export interface MissionDiagramLayout {
  missionId: string;
  title: string;
  description?: string;
  status: string;
  planVersion: number;
  replanCount: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  stations: Record<string, LayoutStation>;
  tracks: LayoutTrack[];
  lockPlates: Record<string, LayoutLockPlate>;
}
