/**
 * AGENTIC OS — INTERLOCKING ADAPTER TYPES (Pure TypeScript)
 * Authoritative data contracts transforming backend entities into spatial World entities.
 * STRICT RULE: ZERO Three.js or DOM dependencies.
 */

// ============================================================================
// 1. DOMAIN ENUMS (1:1 with Backend Models)
// ============================================================================

export type BackendTaskStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "BLOCKED";

export type BackendMissionStatus =
  | "PLANNING"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "WAITING_APPROVAL"
  | "FAILED"
  | "COMPLETED"
  | "CANCELLED";

export type BackendAgentType =
  | "PLANNER"
  | "RESEARCHER"
  | "CODER"
  | "REVIEWER"
  | "EXECUTOR";

export type BackendRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BackendApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "EXPIRED"
  | "CANCELLED";

export type BackendMemoryType = "WORKING" | "EPISODIC" | "SEMANTIC";

export type BackendMemorySource =
  | "TASK_RESULT"
  | "TASK_FAILURE"
  | "TOOL_RESULT"
  | "AGENT_DECISION"
  | "REVIEW_RESULT"
  | "USER_INPUT"
  | "MISSION_SUMMARY"
  | "MANUAL";

export type BackendEventType =
  // Mission events
  | "MISSION_CREATED"
  | "MISSION_STARTED"
  | "MISSION_PAUSED"
  | "MISSION_RESUMED"
  | "MISSION_WAITING_APPROVAL"
  | "MISSION_COMPLETED"
  | "MISSION_FAILED"
  | "MISSION_CANCELLED"
  // Task events
  | "TASK_CREATED"
  | "TASK_READY"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_CANCELLED"
  | "TASK_BLOCKED"
  // Agent Run events
  | "AGENT_RUN_STARTED"
  | "AGENT_RUN_UPDATED"
  | "AGENT_RUN_COMPLETED"
  | "AGENT_RUN_FAILED"
  // Tool events
  | "TOOL_REQUESTED"
  | "TOOL_AUTHORIZED"
  | "TOOL_STARTED"
  | "TOOL_COMPLETED"
  | "TOOL_FAILED"
  | "TOOL_DENIED"
  // Approval events
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_DENIED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_CANCELLED"
  // DAG & Replanning events
  | "DAG_TASK_UNLOCKED"
  | "REPLAN_REQUESTED"
  | "REPLAN_COMPLETED"
  | "MEMORY_CREATED"
  | "MEMORY_RETRIEVED"
  | "FAILURE_ANALYSIS_STARTED"
  | "FAILURE_ANALYZED"
  | "RECOVERY_TASK_CREATED"
  | "RETRY_STARTED"
  | "RETRY_EXHAUSTED"
  | "HUMAN_INTERVENTION_REQUIRED";

// ============================================================================
// 2. SPATIAL SCENE ENUMS & GEOMETRY
// ============================================================================

export type SemanticZoomLevel = "BOARD" | "DISTRICT" | "SHEET" | "STATION";

export type DistrictId =
  | "MISSIONS_YARD"
  | "PLANNING_GANTRY"
  | "AGENT_DEPOT"
  | "CONTROL"
  | "TOOL_WORKSHOP"
  | "FAILURE_HOUSE"
  | "MEMORY_ARCHIVE"
  | "OBSERVABILITY";

export type SignalArmPosition = "HORIZONTAL" | "CLEAR_45_DOWN";
export type SignalLampState = "DARK" | "PALE_CLEAR" | "AMBER" | "RED";

export type SceneRouteVisualState =
  | "PENDING_DASHED"
  | "SET_SOLID"
  | "ENERGIZED_AMBER"
  | "FRACTURED_RED"
  | "GHOST_REVISED"
  | "RECOVERY_DASHED";

export interface SceneCoordinate {
  x: number;
  y: number; // Elevation above control table
  z: number;
}

// ============================================================================
// 3. SPATIAL SCENE ENTITIES
// ============================================================================

export interface SceneStation {
  id: string;
  missionId: string;
  title: string;
  description?: string;
  state: BackendTaskStatus;
  isRecovery: boolean;
  priority: number;
  assignedAgentId?: string;
  position: SceneCoordinate;
  dimensions: { width: number; height: number; depth: number };
  incomingPrerequisites: string[]; // Dependencies
  lockPinsRaised: number;         // Count of unmet dependencies
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  outputData?: Record<string, any>;
  hasApprovalBarrier: boolean;
  activeApprovalId?: string;
}

export interface SceneRoute {
  id: string;
  sourceStationId: string;
  targetStationId: string;
  state: SceneRouteVisualState;
  waypoints: SceneCoordinate[];
  hasSwitchBlade: boolean;
  switchBladeThrown: boolean;
  isSupersededGhost: boolean;
}

export interface SceneSignal {
  id: string;
  stationId: string;
  armPosition: SignalArmPosition;
  lampState: SignalLampState;
  hasClockExpiryDisc: boolean;
  expiresAt?: string;
  status: "LOCKED_DANGER" | "PROCEED_CLEAR" | "HOLD_APPROVAL";
}

export interface SceneAgent {
  agentId: string;
  agentType: BackendAgentType;
  name: string;
  status: "ONLINE" | "BUSY" | "OFFLINE";
  carrierStatus: "PARKED_DEPOT" | "TRANSIT_FEEDER" | "WORKING_STATION";
  currentStationId?: string;
  currentTaskTitle?: string;
  position: SceneCoordinate;
  lampLit: boolean;
  toolInUse?: string;
}

export interface SceneApproval {
  id: string;
  missionId: string;
  taskId: string;
  agentId: string;
  toolName: string;
  riskLevel: BackendRiskLevel;
  reason: string;
  arguments: Record<string, any>;
  argumentsHash: string;
  status: BackendApprovalStatus;
  requestedAt: string;
  expiresAt: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface SceneMemory {
  id: string;
  memoryType: BackendMemoryType;
  source: BackendMemorySource;
  content: string;
  contentPreview: string;
  importance: number;
  relevanceScore?: number;
  missionId?: string;
  taskId?: string;
  position: SceneCoordinate;
}

export interface SceneRevision {
  version: number;
  parentVersion?: number;
  strategy: string;
  reason: string;
  createdAt: string;
  taskCount: number;
}

export interface SceneEvent {
  id: string;
  eventType: BackendEventType;
  sequenceNumber: number;
  correlationId: string;
  missionId?: string;
  taskId?: string;
  agentId?: string;
  timestamp: string;
  source: string;
  payload: Record<string, any>;
}

export interface SceneMission {
  id: string;
  title: string;
  goal: string;
  status: BackendMissionStatus;
  planVersion: number;
  replanCount: number;
  progress: number;
  stations: SceneStation[];
  routes: SceneRoute[];
  signals: SceneSignal[];
  approvals: SceneApproval[];
  revisions: SceneRevision[];
  isSheetUnfolded: boolean;
}

// ============================================================================
// 4. UNIFIED SCENE MODEL
// ============================================================================

export interface SceneModel {
  missions: Record<string, SceneMission>;
  activeMissionId: string | null;
  activeDistrict: DistrictId;
  zoomLevel: SemanticZoomLevel;
  agents: Record<string, SceneAgent>;
  archiveEntries: SceneMemory[];
  recentEvents: SceneEvent[];
  lastSequenceNumber: number;
  hasPendingGapResync: boolean;
}

// ============================================================================
// 5. CHOREOGRAPHY OPERATIONS (For animation driver consumption only)
// ============================================================================

export type ChoreographyOpType =
  | "TASK_FAILED"
  | "STATION_STATUS_CHANGED"
  | "SIGNAL_DANGER"
  | "SIGNAL_CLEAR"
  | "PULSE_TELEGRAPH_ANALYSIS"
  | "SLIDE_MEMORY_RECORD_CARDS"
  | "THROW_SWITCH_BLADE"
  | "RESET_SWITCH_BLADE"
  | "RISE_RECOVERY_STATION"
  | "GHOST_SUPERSEDED_ROUTES"
  | "EASE_STATIONS_REPLAN"
  | "FLIP_SPLIT_FLAP_VERSION"
  | "DISPATCH_AGENT_CARRIER"
  | "RETURN_AGENT_CARRIER"
  | "UNFOLD_MISSION_SHEET"
  | "APPROVAL_HOLD_BARRIER"
  | "APPROVAL_CLEAR_BARRIER";

export interface ChoreographyOp {
  type: ChoreographyOpType;
  targetId: string;
  durationMs: number;
  delayMs?: number;
  payload?: Record<string, any>;
}
