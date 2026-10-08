/**
 * AGENTIC OS — INTERLOCKING DISTRICT DEFINITIONS & WAYPOINTS
 * Defines the 8 architectural districts across the control board.
 */

import { DistrictId } from "../adapter/types";

export interface DistrictDefinition {
  id: DistrictId;
  label: string;
  signageName: string;
  shortcutKey: string;
  cameraWaypoint: {
    target: [number, number, number];
    distance: number;
    pitch: number; // In degrees
    yaw: number;   // In degrees
  };
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  description: string;
}

export const DISTRICTS: Record<DistrictId, DistrictDefinition> = {
  CONTROL: {
    id: "CONTROL",
    label: "Control Tower",
    signageName: "CONTROL",
    shortcutKey: "1",
    cameraWaypoint: {
      target: [0, 1.5, 0],
      distance: 76,
      pitch: 28,
      yaw: -6,
    },
    bounds: { minX: -40, maxX: 40, minZ: -30, maxZ: 30 },
    description: "Interlocking switch tower, state machine & permission guard.",
  },
  MISSIONS_YARD: {
    id: "MISSIONS_YARD",
    label: "Missions Yard",
    signageName: "MISSIONS YARD",
    shortcutKey: "2",
    cameraWaypoint: {
      target: [-135, 1.0, 0],
      distance: 68,
      pitch: 26,
      yaw: -10,
    },
    bounds: { minX: -220, maxX: -70, minZ: -40, maxZ: 40 },
    description: "Parallel sidings holding active and completed mission sheets.",
  },
  PLANNING_GANTRY: {
    id: "PLANNING_GANTRY",
    label: "Planning Gantry",
    signageName: "PLANNING GANTRY",
    shortcutKey: "3",
    cameraWaypoint: {
      target: [-70, 2.0, -22],
      distance: 58,
      pitch: 26,
      yaw: -8,
    },
    bounds: { minX: -90, maxX: -40, minZ: -40, maxZ: 10 },
    description: "Signal bridge where Planner Agent draws DAG track routes.",
  },
  AGENT_DEPOT: {
    id: "AGENT_DEPOT",
    label: "Agent Depot",
    signageName: "AGENT DEPOT",
    shortcutKey: "4",
    cameraWaypoint: {
      target: [-30, 1.5, 58],
      distance: 62,
      pitch: 25,
      yaw: -4,
    },
    bounds: { minX: -60, maxX: 30, minZ: 40, maxZ: 90 },
    description: "Maintenance bays holding specialized agent carriers.",
  },
  TOOL_WORKSHOP: {
    id: "TOOL_WORKSHOP",
    label: "Tool Workshop",
    signageName: "TOOL WORKSHOP",
    shortcutKey: "5",
    cameraWaypoint: {
      target: [82, 1.5, -12],
      distance: 64,
      pitch: 27,
      yaw: 10,
    },
    bounds: { minX: 45, maxX: 120, minZ: -35, maxZ: 25 },
    description: "Sandboxed perimeter yard executing tool operations.",
  },
  FAILURE_HOUSE: {
    id: "FAILURE_HOUSE",
    label: "Failure House",
    signageName: "FAILURE HOUSE",
    shortcutKey: "6",
    cameraWaypoint: {
      target: [98, 1.5, 68],
      distance: 60,
      pitch: 24,
      yaw: 12,
    },
    bounds: { minX: 65, maxX: 135, minZ: 45, maxZ: 95 },
    description: "Root-cause failure classification and triage station.",
  },
  MEMORY_ARCHIVE: {
    id: "MEMORY_ARCHIVE",
    label: "Memory Archive",
    signageName: "MEMORY ARCHIVE",
    shortcutKey: "7",
    cameraWaypoint: {
      target: [0, 1.5, 105],
      distance: 78,
      pitch: 25,
      yaw: 2,
    },
    bounds: { minX: -60, maxX: 60, minZ: 85, maxZ: 145 },
    description: "Working sidings, episodic carriages, and underground semantic cutaway.",
  },
  OBSERVABILITY: {
    id: "OBSERVABILITY",
    label: "Observability Tape",
    signageName: "OBSERVABILITY",
    shortcutKey: "8",
    cameraWaypoint: {
      target: [0, 1.5, -88],
      distance: 82,
      pitch: 28,
      yaw: -2,
    },
    bounds: { minX: -200, maxX: 200, minZ: -120, maxZ: -60 },
    description: "Telegraph tape running along the north edge recording telemetry.",
  },
};
