/**
 * AGENTIC OS — INTERLOCKING EVENT ADAPTER & GAP RESYNC (Pure TypeScript)
 * Processes domain events with monotonic sequence verification, gap detection, and state patching.
 * STRICT RULE: ZERO Three.js or DOM dependencies.
 */

import type {
  SceneModel,
  SceneEvent,
  BackendEventType,
  SceneStation,
  SceneSignal,
  SceneMemory,
  SceneApproval,
} from "./types.ts";

export interface RawDomainEvent {
  id: string;
  event_type: string;
  mission_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  agent_run_id: string | null;
  tool_run_id: string | null;
  approval_id: string | null;
  correlation_id: string;
  sequence_number: number;
  timestamp: string;
  source: string;
  payload: Record<string, any>;
}

export type EventProcessingResult =
  | {
      type: "PROCESSED";
      event: SceneEvent;
      updatedModel: SceneModel;
    }
  | {
      type: "SEQUENCE_GAP";
      expectedSeq: number;
      receivedSeq: number;
      missingCount: number;
      event: SceneEvent;
    }
  | {
      type: "IGNORED_DUPLICATE";
      sequenceNumber: number;
    };

/**
 * Transforms raw backend WebSocket event into typed SceneEvent.
 */
export function parseDomainEvent(raw: RawDomainEvent): SceneEvent {
  return {
    id: raw.id,
    eventType: raw.event_type as BackendEventType,
    sequenceNumber: raw.sequence_number,
    correlationId: raw.correlation_id,
    missionId: raw.mission_id || undefined,
    taskId: raw.task_id || undefined,
    agentId: raw.agent_id || undefined,
    timestamp: raw.timestamp,
    source: raw.source,
    payload: raw.payload || {},
  };
}

/**
 * Validates monotonic sequence ordering and applies incremental patches to SceneModel.
 */
export function handleIncomingEvent(
  model: SceneModel,
  rawEvent: RawDomainEvent
): EventProcessingResult {
  const sceneEvent = parseDomainEvent(rawEvent);
  const currentSeq = model.lastSequenceNumber;

  // 1. Ignore duplicate or stale events
  if (currentSeq > 0 && sceneEvent.sequenceNumber <= currentSeq) {
    return {
      type: "IGNORED_DUPLICATE",
      sequenceNumber: sceneEvent.sequenceNumber,
    };
  }

  // 2. Detect sequence gaps
  if (currentSeq > 0 && sceneEvent.sequenceNumber > currentSeq + 1) {
    return {
      type: "SEQUENCE_GAP",
      expectedSeq: currentSeq + 1,
      receivedSeq: sceneEvent.sequenceNumber,
      missingCount: sceneEvent.sequenceNumber - (currentSeq + 1),
      event: sceneEvent,
    };
  }

  // 3. Apply deterministic incremental patch
  const updatedModel = patchSceneModelWithEvent(model, sceneEvent);

  return {
    type: "PROCESSED",
    event: sceneEvent,
    updatedModel: {
      ...updatedModel,
      lastSequenceNumber: sceneEvent.sequenceNumber,
      hasPendingGapResync: false,
      recentEvents: [sceneEvent, ...model.recentEvents].slice(0, 50),
    },
  };
}

/**
 * Pure deterministic state patcher applying domain event to SceneModel.
 */
export function patchSceneModelWithEvent(
  model: SceneModel,
  event: SceneEvent
): SceneModel {
  const missionId = event.missionId;
  if (!missionId || !model.missions[missionId]) {
    return model;
  }

  const mission = { ...model.missions[missionId] };
  let stations = [...mission.stations];
  let signals = [...mission.signals];
  let routes = [...mission.routes];
  let approvals = [...mission.approvals];
  let agents = { ...model.agents };
  let archiveEntries = [...model.archiveEntries];

  switch (event.eventType) {
    case "TASK_FAILED": {
      const taskId = event.taskId || event.payload?.task_id;
      stations = stations.map((s) => {
        if (s.id === taskId) {
          return {
            ...s,
            state: "FAILED",
            errorMessage: event.payload?.error || "Execution failure",
            retryCount: event.payload?.retry_count ?? s.retryCount + 1,
          };
        }
        return s;
      });

      signals = signals.map((sig) => {
        if (sig.stationId === taskId) {
          return {
            ...sig,
            armPosition: "HORIZONTAL",
            lampState: "RED",
            status: "LOCKED_DANGER",
          };
        }
        return sig;
      });

      routes = routes.map((r) => {
        if (r.targetStationId === taskId) {
          return { ...r, state: "FRACTURED_RED" };
        }
        return r;
      });
      break;
    }

    case "RECOVERY_TASK_CREATED": {
      const recoveryTaskId = event.payload?.recovery_task_id || event.taskId;
      const recoveryTitle = event.payload?.recovery_task_title || "Fix & Recover Task";
      const failedTaskId = event.payload?.failed_task_id;

      const newStation: SceneStation = {
        id: recoveryTaskId,
        missionId: mission.id,
        title: recoveryTitle,
        state: "READY",
        isRecovery: true,
        priority: 2,
        assignedAgentId: "agent_executor",
        position: { x: stations.length * 24 - 40, y: 0.35, z: -12 },
        dimensions: { width: 16, height: 1.2, depth: 6 },
        incomingPrerequisites: [],
        lockPinsRaised: 0,
        retryCount: 0,
        maxRetries: 3,
        hasApprovalBarrier: false,
      };

      const newSignal: SceneSignal = {
        id: `signal_${recoveryTaskId}`,
        stationId: recoveryTaskId,
        armPosition: "CLEAR_45_DOWN",
        lampState: "PALE_CLEAR",
        hasClockExpiryDisc: false,
        status: "PROCEED_CLEAR",
      };

      // Add recovery siding route
      if (failedTaskId) {
        routes.push({
          id: `route_${recoveryTaskId}_${failedTaskId}`,
          sourceStationId: recoveryTaskId,
          targetStationId: failedTaskId,
          state: "RECOVERY_DASHED",
          waypoints: [
            newStation.position,
            { x: newStation.position.x + 8, y: 0.2, z: -6 },
            { x: newStation.position.x + 16, y: 0.15, z: 0 },
          ],
          hasSwitchBlade: true,
          switchBladeThrown: true,
          isSupersededGhost: false,
        });
      }

      stations.push(newStation);
      signals.push(newSignal);
      break;
    }

    case "REPLAN_COMPLETED": {
      mission.planVersion = event.payload?.new_plan_version ?? mission.planVersion + 1;
      mission.replanCount = (mission.replanCount || 0) + 1;
      break;
    }

    case "DAG_TASK_UNLOCKED":
    case "TASK_READY": {
      const taskId = event.taskId || event.payload?.task_id;
      stations = stations.map((s) => {
        if (s.id === taskId) {
          return {
            ...s,
            state: "READY",
            lockPinsRaised: 0,
          };
        }
        return s;
      });

      signals = signals.map((sig) => {
        if (sig.stationId === taskId) {
          return {
            ...sig,
            armPosition: "CLEAR_45_DOWN",
            lampState: "PALE_CLEAR",
            status: "PROCEED_CLEAR",
          };
        }
        return sig;
      });

      routes = routes.map((r) => {
        if (r.targetStationId === taskId) {
          return { ...r, state: "SET_SOLID" };
        }
        return r;
      });
      break;
    }

    case "TASK_STARTED": {
      const taskId = event.taskId || event.payload?.task_id;
      const assignedAgent = event.payload?.assigned_agent || event.agentId;

      stations = stations.map((s) => {
        if (s.id === taskId) {
          return { ...s, state: "RUNNING" };
        }
        return s;
      });

      signals = signals.map((sig) => {
        if (sig.stationId === taskId) {
          return { ...sig, lampState: "AMBER", armPosition: "CLEAR_45_DOWN", status: "PROCEED_CLEAR" };
        }
        return sig;
      });

      routes = routes.map((r) => {
        if (r.targetStationId === taskId) {
          return { ...r, state: "ENERGIZED_AMBER" };
        }
        return r;
      });

      // Dispatch agent carrier
      if (assignedAgent) {
        const agentKey = Object.keys(agents).find(
          (k) => k === assignedAgent || agents[k].agentType === assignedAgent
        );
        if (agentKey) {
          agents[agentKey] = {
            ...agents[agentKey],
            status: "BUSY",
            carrierStatus: "WORKING_STATION",
            currentStationId: taskId,
            lampLit: true,
          };
        }
      }
      break;
    }

    case "TASK_COMPLETED": {
      const taskId = event.taskId || event.payload?.task_id;

      stations = stations.map((s) => {
        if (s.id === taskId) {
          return {
            ...s,
            state: "COMPLETED",
            outputData: event.payload?.output_data,
          };
        }
        return s;
      });

      signals = signals.map((sig) => {
        if (sig.stationId === taskId) {
          return {
            ...sig,
            armPosition: "CLEAR_45_DOWN",
            lampState: "PALE_CLEAR",
            status: "PROCEED_CLEAR",
          };
        }
        return sig;
      });

      routes = routes.map((r) => {
        if (r.sourceStationId === taskId && r.hasSwitchBlade) {
          return { ...r, switchBladeThrown: false, state: "SET_SOLID" };
        }
        return r;
      });
      break;
    }

    case "RETRY_STARTED": {
      const taskId = event.taskId;
      stations = stations.map((s) => {
        if (s.id === taskId) {
          return {
            ...s,
            state: "READY",
            retryCount: event.payload?.retry_count ?? s.retryCount,
          };
        }
        return s;
      });
      break;
    }

    case "MEMORY_RETRIEVED": {
      const previews = event.payload?.previews || [];
      if (previews.length > 0) {
        const newEntries: SceneMemory[] = previews.map((p: any, idx: number) => ({
          id: p.id,
          memoryType: p.memory_type,
          source: p.source,
          content: p.content_preview,
          contentPreview: p.content_preview,
          importance: p.importance || 3,
          relevanceScore: p.relevance_score,
          missionId: mission.id,
          position: { x: idx * 8 - 12, y: 0.1, z: 110 },
        }));
        archiveEntries = [...newEntries, ...archiveEntries];
      }
      break;
    }

    case "APPROVAL_REQUESTED": {
      const approvalId = event.payload?.approval_id || event.payload?.id;
      const taskId = event.taskId;

      if (approvalId && taskId) {
        const approval: SceneApproval = {
          id: approvalId,
          missionId: mission.id,
          taskId: taskId,
          agentId: event.agentId || "agent_executor",
          toolName: event.payload?.tool_name || "system_tool",
          riskLevel: event.payload?.risk_level || "HIGH",
          reason: event.payload?.reason || "High risk operation requires operator approval",
          arguments: event.payload?.arguments || {},
          argumentsHash: event.payload?.arguments_hash || "",
          status: "PENDING",
          requestedAt: event.timestamp,
          expiresAt: event.payload?.expires_at || "",
        };

        approvals.push(approval);

        stations = stations.map((s) => {
          if (s.id === taskId) {
            return {
              ...s,
              state: "WAITING_APPROVAL",
              hasApprovalBarrier: true,
              activeApprovalId: approvalId,
            };
          }
          return s;
        });

        signals = signals.map((sig) => {
          if (sig.stationId === taskId) {
            return {
              ...sig,
              armPosition: "HORIZONTAL",
              lampState: "AMBER",
              hasClockExpiryDisc: true,
              expiresAt: approval.expiresAt,
              status: "HOLD_APPROVAL",
            };
          }
          return sig;
        });
      }
      break;
    }

    case "APPROVAL_APPROVED":
    case "APPROVAL_DENIED": {
      const approvalId = event.payload?.approval_id;
      approvals = approvals.map((a) => {
        if (a.id === approvalId) {
          return {
            ...a,
            status: event.eventType === "APPROVAL_APPROVED" ? "APPROVED" : "DENIED",
            decidedBy: event.payload?.decided_by,
          };
        }
        return a;
      });
      break;
    }

    case "MISSION_COMPLETED": {
      mission.status = "COMPLETED";
      mission.progress = 100;
      break;
    }
  }

  return {
    ...model,
    missions: {
      ...model.missions,
      [missionId]: {
        ...mission,
        stations,
        signals,
        routes,
        approvals,
      },
    },
    agents,
    archiveEntries,
  };
}
