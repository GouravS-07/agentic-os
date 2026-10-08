import { Mission, Task, AgentRole, TaskStatus, MissionStatus } from "@/types";

export type SpatialView =
  | "HOME"
  | "MISSIONS"
  | "MISSION_DETAIL"
  | "AGENTS"
  | "TASKS"
  | "OVERVIEW";

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  transitionSpeed?: number;
}

export type SelectedEntityType = "MISSION" | "TASK" | "AGENT" | "CORE";

export interface SelectedEntity {
  type: SelectedEntityType;
  id: string;
  data?: any;
}

export interface SpatialTaskNode {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  position: [number, number, number];
  dependencies: string[];
  assignedAgentId?: string;
  isRecovery?: boolean;
  retryCount?: number;
}

export interface SpatialConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  status: TaskStatus;
  isRecovery?: boolean;
}

export interface SpatialAgentEntity {
  id: string;
  name: string;
  type: string;
  status: "IDLE" | "RUNNING" | "WAITING" | "ERROR";
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  currentTaskTitle?: string;
  color: string;
}

export interface SceneTelemetry {
  activeMissionsCount: number;
  runningTasksCount: number;
  pendingApprovalsCount: number;
  replansCount: number;
  coreState: "IDLE" | "PLANNING" | "RUNNING" | "WAITING_APPROVAL" | "RECOVERING" | "COMPLETED";
}
