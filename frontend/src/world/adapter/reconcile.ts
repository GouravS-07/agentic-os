/**
 * AGENTIC OS — INTERLOCKING STATE RECONCILER (Pure TypeScript)
 * Authoritative transformation of backend snapshots into canonical SceneModel.
 * STRICT RULE: ZERO Three.js or DOM dependencies.
 */

import type {
  SceneModel,
  SceneMission,
  SceneStation,
  SceneRoute,
  SceneSignal,
  SceneAgent,
  SceneApproval,
  SceneMemory,
  SceneRevision,
  BackendTaskStatus,
  BackendMissionStatus,
  BackendAgentType,
  BackendRiskLevel,
  BackendApprovalStatus,
  BackendMemoryType,
  BackendMemorySource,
} from "./types.ts";

// Standard Registry Agents
export function createDefaultAgents(): Record<string, SceneAgent> {
  return {
    agent_planner: {
      agentId: "agent_planner",
      agentType: "PLANNER",
      name: "Mission Planner Gantry",
      status: "ONLINE",
      carrierStatus: "PARKED_DEPOT",
      position: { x: -70, y: 0.2, z: -20 },
      lampLit: false,
    },
    agent_coder: {
      agentId: "agent_coder",
      agentType: "CODER",
      name: "Code Synthesizer Flatbed",
      status: "ONLINE",
      carrierStatus: "PARKED_DEPOT",
      position: { x: -45, y: 0.2, z: 60 },
      lampLit: false,
    },
    agent_researcher: {
      agentId: "agent_researcher",
      agentType: "RESEARCHER",
      name: "Knowledge Survey Trolley",
      status: "ONLINE",
      carrierStatus: "PARKED_DEPOT",
      position: { x: -30, y: 0.2, z: 60 },
      lampLit: false,
    },
    agent_reviewer: {
      agentId: "agent_reviewer",
      agentType: "REVIEWER",
      name: "Inspection Lens Car",
      status: "ONLINE",
      carrierStatus: "PARKED_DEPOT",
      position: { x: -15, y: 0.2, z: 60 },
      lampLit: false,
    },
    agent_executor: {
      agentId: "agent_executor",
      agentType: "EXECUTOR",
      name: "Heavy Dispatch Locomotive",
      status: "ONLINE",
      carrierStatus: "PARKED_DEPOT",
      position: { x: 0, y: 0.2, z: 60 },
      lampLit: false,
    },
  };
}

export function createInitialSceneModel(): SceneModel {
  return {
    missions: {},
    activeMissionId: null,
    activeDistrict: "CONTROL",
    zoomLevel: "BOARD",
    agents: createDefaultAgents(),
    archiveEntries: [],
    recentEvents: [],
    lastSequenceNumber: 0,
    hasPendingGapResync: false,
  };
}

export interface BackendTaskInput {
  id: string;
  mission_id: string;
  title: string;
  description?: string;
  status: string;
  priority?: number;
  assigned_agent_id?: string;
  dependencies?: string[];
  retry_count?: number;
  max_retries?: number;
  error_message?: string;
  output_data?: Record<string, any>;
  input_data?: Record<string, any>;
}

export interface BackendMissionInput {
  id: string;
  title: string;
  description: string;
  status: string;
  plan_version: number;
  replan_count: number;
  progress: number;
}

export interface BackendApprovalInput {
  id: string;
  mission_id: string;
  task_id: string;
  agent_id: string;
  tool_name: string;
  risk_level: string;
  reason: string;
  arguments: Record<string, any>;
  arguments_hash: string;
  status: string;
  requested_at: string;
  expires_at: string;
  decided_by?: string;
  decision_metadata?: Record<string, any>;
}

export interface BackendRevisionInput {
  version: number;
  parent_version?: number;
  strategy: string;
  reason: string;
  created_at: string;
  plan_snapshot?: { tasks?: any[] };
}

export interface BackendMemoryInput {
  id: string;
  memory_type: string;
  source: string;
  content: string;
  importance: number;
  relevance_score?: number;
  mission_id?: string;
  task_id?: string;
}

/**
 * Reconciles a mission snapshot into a validated SceneMission.
 */
export function reconcileMission(
  prevModel: SceneModel,
  missionData: BackendMissionInput,
  tasksData: BackendTaskInput[],
  approvalsData: BackendApprovalInput[] = [],
  revisionsData: BackendRevisionInput[] = [],
  memoriesData: BackendMemoryInput[] = []
): SceneModel {
  // 1. Map Tasks to Stations
  const taskMap = new Map(tasksData.map((t) => [t.id, t]));
  const pendingApprovals = new Map(
    approvalsData
      .filter((a) => a.status === "PENDING")
      .map((a) => [a.task_id, a])
  );

  const stations: SceneStation[] = tasksData.map((t, idx) => {
    const rawStatus = (t.status || "PENDING").toUpperCase() as BackendTaskStatus;
    const dependencies = t.dependencies || [];
    
    // Calculate how many prerequisites are not yet COMPLETED
    let unmetPrereqs = 0;
    dependencies.forEach((depId) => {
      const dep = taskMap.get(depId);
      if (!dep || dep.status !== "COMPLETED") {
        unmetPrereqs++;
      }
    });

    const isRecovery =
      t.title.toLowerCase().startsWith("fix & recover") ||
      t.title.toLowerCase().startsWith("recovery:");

    const approval = pendingApprovals.get(t.id);

    return {
      id: t.id,
      missionId: missionData.id,
      title: t.title,
      description: t.description,
      state: rawStatus,
      isRecovery,
      priority: t.priority || 2,
      assignedAgentId: t.assigned_agent_id,
      position: {
        x: idx * 24 - (tasksData.length * 12),
        y: isRecovery ? 0.35 : 0.15,
        z: isRecovery ? -12 : 0,
      },
      dimensions: { width: 16, height: 1.2, depth: 6 },
      incomingPrerequisites: dependencies,
      lockPinsRaised: unmetPrereqs,
      retryCount: t.retry_count || 0,
      maxRetries: t.max_retries || 3,
      errorMessage: t.error_message,
      outputData: t.output_data,
      hasApprovalBarrier: Boolean(approval),
      activeApprovalId: approval?.id,
    };
  });

  // 2. Map Routes (Edges between dependencies)
  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const routes: SceneRoute[] = [];

  tasksData.forEach((t) => {
    const targetStation = stationMap.get(t.id);
    (t.dependencies || []).forEach((depId) => {
      const sourceStation = stationMap.get(depId);
      if (!targetStation || !sourceStation) return;

      let state: SceneRoute["state"] = "PENDING_DASHED";
      if (targetStation.state === "FAILED") {
        state = "FRACTURED_RED";
      } else if (sourceStation.state === "RUNNING" || targetStation.state === "RUNNING") {
        state = "ENERGIZED_AMBER";
      } else if (targetStation.state === "READY" || targetStation.state === "COMPLETED") {
        state = "SET_SOLID";
      } else if (targetStation.isRecovery) {
        state = "RECOVERY_DASHED";
      }

      routes.push({
        id: `route_${depId}_${t.id}`,
        sourceStationId: depId,
        targetStationId: t.id,
        state,
        waypoints: [
          sourceStation.position,
          {
            x: (sourceStation.position.x + targetStation.position.x) / 2,
            y: sourceStation.position.y,
            z: (sourceStation.position.z + targetStation.position.z) / 2,
          },
          targetStation.position,
        ],
        hasSwitchBlade: targetStation.isRecovery,
        switchBladeThrown: targetStation.isRecovery && targetStation.state !== "COMPLETED",
        isSupersededGhost: false,
      });
    });
  });

  // 3. Map Signals
  const signals: SceneSignal[] = stations.map((s) => {
    let armPosition: SceneSignal["armPosition"] = "HORIZONTAL";
    let lampState: SceneSignal["lampState"] = "DARK";
    let status: SceneSignal["status"] = "LOCKED_DANGER";

    if (s.state === "FAILED") {
      armPosition = "HORIZONTAL";
      lampState = "RED";
      status = "LOCKED_DANGER";
    } else if (s.state === "WAITING_APPROVAL") {
      armPosition = "HORIZONTAL";
      lampState = "AMBER";
      status = "HOLD_APPROVAL";
    } else if (s.state === "RUNNING") {
      armPosition = "CLEAR_45_DOWN";
      lampState = "AMBER";
      status = "PROCEED_CLEAR";
    } else if (s.state === "READY" || s.state === "COMPLETED") {
      armPosition = "CLEAR_45_DOWN";
      lampState = "PALE_CLEAR";
      status = "PROCEED_CLEAR";
    } else if (s.state === "BLOCKED") {
      armPosition = "HORIZONTAL";
      lampState = "RED";
      status = "LOCKED_DANGER";
    }

    const approval = pendingApprovals.get(s.id);

    return {
      id: `signal_${s.id}`,
      stationId: s.id,
      armPosition,
      lampState,
      hasClockExpiryDisc: Boolean(approval),
      expiresAt: approval?.expires_at,
      status,
    };
  });

  // 4. Map Approvals
  const approvals: SceneApproval[] = approvalsData.map((a) => ({
    id: a.id,
    missionId: a.mission_id,
    taskId: a.task_id,
    agentId: a.agent_id,
    toolName: a.tool_name,
    riskLevel: a.risk_level as BackendRiskLevel,
    reason: a.reason,
    arguments: a.arguments || {},
    argumentsHash: a.arguments_hash,
    status: a.status as BackendApprovalStatus,
    requestedAt: a.requested_at,
    expiresAt: a.expires_at,
    decidedBy: a.decided_by,
    decisionNote: a.decision_metadata?.note,
  }));

  // 5. Map Revisions
  const revisions: SceneRevision[] = revisionsData.map((r) => ({
    version: r.version,
    parentVersion: r.parent_version,
    strategy: r.strategy,
    reason: r.reason,
    createdAt: r.created_at,
    taskCount: r.plan_snapshot?.tasks?.length || 0,
  }));

  // 6. Update Agent Fleet Positions from Running Tasks
  const updatedAgents = { ...prevModel.agents };
  const runningTask = stations.find((s) => s.state === "RUNNING");

  if (runningTask && runningTask.assignedAgentId) {
    const matchedAgentKey = Object.keys(updatedAgents).find(
      (k) =>
        k === runningTask.assignedAgentId ||
        updatedAgents[k].agentType === runningTask.assignedAgentId
    );
    if (matchedAgentKey) {
      updatedAgents[matchedAgentKey] = {
        ...updatedAgents[matchedAgentKey],
        status: "BUSY",
        carrierStatus: "WORKING_STATION",
        currentStationId: runningTask.id,
        currentTaskTitle: runningTask.title,
        lampLit: true,
      };
    }
  } else if (!runningTask) {
    // Return all carriers to depot if no tasks are running
    Object.keys(updatedAgents).forEach((k) => {
      updatedAgents[k] = {
        ...updatedAgents[k],
        status: "ONLINE",
        carrierStatus: "PARKED_DEPOT",
        currentStationId: undefined,
        currentTaskTitle: undefined,
        lampLit: false,
      };
    });
  }

  // 7. Map Memories
  const archiveEntries: SceneMemory[] = memoriesData.map((m, idx) => ({
    id: m.id,
    memoryType: m.memory_type as BackendMemoryType,
    source: m.source as BackendMemorySource,
    content: m.content,
    contentPreview: m.content.slice(0, 140),
    importance: m.importance,
    relevanceScore: m.relevance_score,
    missionId: m.mission_id,
    taskId: m.task_id,
    position: {
      x: idx * 8 - (memoriesData.length * 4),
      y: 0.1,
      z: 110,
    },
  }));

  const updatedMission: SceneMission = {
    id: missionData.id,
    title: missionData.title,
    goal: missionData.description,
    status: (missionData.status || "PLANNING").toUpperCase() as BackendMissionStatus,
    planVersion: missionData.plan_version,
    replanCount: missionData.replan_count,
    progress: missionData.progress,
    stations,
    routes,
    signals,
    approvals,
    revisions,
    isSheetUnfolded: prevModel.activeMissionId === missionData.id,
  };

  return {
    ...prevModel,
    missions: {
      ...prevModel.missions,
      [missionData.id]: updatedMission,
    },
    agents: updatedAgents,
    archiveEntries: archiveEntries.length > 0 ? archiveEntries : prevModel.archiveEntries,
  };
}
