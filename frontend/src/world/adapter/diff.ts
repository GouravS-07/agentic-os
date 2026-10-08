/**
 * AGENTIC OS — INTERLOCKING DIFF ENGINE (Pure TypeScript)
 * Compares successive SceneModel states and outputs ordered Choreography Operations.
 * STRICT RULE: ZERO animation execution in this layer. ZERO Three.js imports.
 */

import type { SceneModel, ChoreographyOp } from "./types.ts";
import { MOTION } from "../motion.ts";

/**
 * Computes ordered choreography operations by diffing previous and next SceneModels.
 */
export function diffSceneModels(prev: SceneModel, next: SceneModel): ChoreographyOp[] {
  const ops: ChoreographyOp[] = [];

  // 1. Mission sheet unfolding
  if (prev.activeMissionId !== next.activeMissionId && next.activeMissionId) {
    ops.push({
      type: "UNFOLD_MISSION_SHEET",
      targetId: next.activeMissionId,
      durationMs: MOTION.TWEEN_STANDARD,
    });
  }

  // 2. Mission station, route, and signal diffing
  const activeMission = next.activeMissionId ? next.missions[next.activeMissionId] : null;
  const prevMission = prev.activeMissionId ? prev.missions[prev.activeMissionId] : null;

  if (activeMission) {
    const prevStationMap = new Map((prevMission?.stations || []).map((s) => [s.id, s]));

    // Check stations
    activeMission.stations.forEach((nextStation) => {
      const prevStation = prevStationMap.get(nextStation.id);

      if (!prevStation) {
        // Newly injected recovery station
        if (nextStation.isRecovery) {
          ops.push(
            {
              type: "THROW_SWITCH_BLADE",
              targetId: nextStation.id,
              durationMs: MOTION.TWEEN_FAST,
            },
            {
              type: "RISE_RECOVERY_STATION",
              targetId: nextStation.id,
              durationMs: MOTION.TWEEN_STANDARD,
              delayMs: 200,
            }
          );
        }
      } else if (prevStation.state !== nextStation.state) {
        ops.push({
          type: "STATION_STATUS_CHANGED",
          targetId: nextStation.id,
          durationMs: MOTION.TWEEN_FAST,
          payload: { fromState: prevStation.state, toState: nextStation.state },
        });

        if (nextStation.state === "FAILED") {
          ops.push(
            {
              type: "TASK_FAILED",
              targetId: nextStation.id,
              durationMs: MOTION.TWEEN_FAST,
              payload: { error: nextStation.errorMessage },
            },
            {
              type: "SIGNAL_DANGER",
              targetId: nextStation.id,
              durationMs: MOTION.TWEEN_FAST,
            }
          );
        } else if (nextStation.state === "WAITING_APPROVAL") {
          ops.push({
            type: "APPROVAL_HOLD_BARRIER",
            targetId: nextStation.id,
            durationMs: MOTION.TWEEN_FAST,
            payload: { approvalId: nextStation.activeApprovalId },
          });
        } else if (
          (prevStation.state === "FAILED" || prevStation.state === "PENDING") &&
          (nextStation.state === "READY" || nextStation.state === "COMPLETED")
        ) {
          ops.push({
            type: "SIGNAL_CLEAR",
            targetId: nextStation.id,
            durationMs: MOTION.TWEEN_FAST,
          });
        } else if (
          nextStation.isRecovery &&
          prevStation.state === "RUNNING" &&
          nextStation.state === "COMPLETED"
        ) {
          ops.push({
            type: "RESET_SWITCH_BLADE",
            targetId: nextStation.id,
            durationMs: MOTION.TWEEN_FAST,
          });
        }
      }
    });

    // Check Plan Version revision
    if (prevMission && activeMission.planVersion > prevMission.planVersion) {
      ops.push(
        {
          type: "FLIP_SPLIT_FLAP_VERSION",
          targetId: activeMission.id,
          durationMs: MOTION.TWEEN_FAST,
          payload: {
            fromVersion: prevMission.planVersion,
            toVersion: activeMission.planVersion,
          },
        },
        {
          type: "GHOST_SUPERSEDED_ROUTES",
          targetId: activeMission.id,
          durationMs: MOTION.TWEEN_STANDARD,
        },
        {
          type: "EASE_STATIONS_REPLAN",
          targetId: activeMission.id,
          durationMs: MOTION.TWEEN_EASE_REPLAN,
          delayMs: 160,
        }
      );
    }
  }

  // 3. Agent Fleet dispatch & return diffing
  Object.keys(next.agents).forEach((agentKey) => {
    const prevAgent = prev.agents[agentKey];
    const nextAgent = next.agents[agentKey];

    if (prevAgent && nextAgent) {
      if (
        prevAgent.carrierStatus !== "WORKING_STATION" &&
        nextAgent.carrierStatus === "WORKING_STATION"
      ) {
        ops.push({
          type: "DISPATCH_AGENT_CARRIER",
          targetId: nextAgent.agentId,
          durationMs: MOTION.TWEEN_CAMERA_FULL,
          payload: { stationId: nextAgent.currentStationId },
        });
      } else if (
        prevAgent.carrierStatus === "WORKING_STATION" &&
        nextAgent.carrierStatus === "PARKED_DEPOT"
      ) {
        ops.push({
          type: "RETURN_AGENT_CARRIER",
          targetId: nextAgent.agentId,
          durationMs: MOTION.TWEEN_CAMERA_HOP,
        });
      }
    }
  });

  // 4. Memory record cards diffing
  if (next.archiveEntries.length > prev.archiveEntries.length) {
    const newCount = next.archiveEntries.length - prev.archiveEntries.length;
    ops.push({
      type: "SLIDE_MEMORY_RECORD_CARDS",
      targetId: "archive_yard",
      durationMs: MOTION.TWEEN_STANDARD,
      payload: { newEntriesCount: newCount },
    });
  }

  return ops;
}
