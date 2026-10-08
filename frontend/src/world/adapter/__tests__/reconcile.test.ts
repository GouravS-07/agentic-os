import test from "node:test";
import assert from "node:assert/strict";
import { createInitialSceneModel, reconcileMission } from "../reconcile.ts";
import {
  RECORDED_MISSION,
  RECORDED_TASKS_INITIAL,
  RECORDED_APPROVAL_REQUEST,
  RECORDED_MEMORIES,
} from "./fixtures/mission-data.ts";

test("Reconcile creates initial SceneModel with default fleet and zero sequence", () => {
  const initial = createInitialSceneModel();
  assert.equal(initial.lastSequenceNumber, 0);
  assert.equal(initial.activeDistrict, "CONTROL");
  assert.equal(initial.zoomLevel, "BOARD");
  assert.equal(Object.keys(initial.agents).length, 5);
  assert.equal(initial.agents.agent_planner.agentType, "PLANNER");
  assert.equal(initial.agents.agent_planner.carrierStatus, "PARKED_DEPOT");
});

test("Reconcile transforms backend mission, tasks, and dependencies into SceneMission", () => {
  const initial = createInitialSceneModel();
  const result = reconcileMission(
    initial,
    RECORDED_MISSION,
    RECORDED_TASKS_INITIAL,
    [RECORDED_APPROVAL_REQUEST],
    [],
    RECORDED_MEMORIES
  );

  const mission = result.missions[RECORDED_MISSION.id];
  assert.ok(mission, "SceneMission should be present");
  assert.equal(mission.id, "mission-demo-001");
  assert.equal(mission.planVersion, 1);
  assert.equal(mission.status, "RUNNING");
  assert.equal(mission.stations.length, 3);

  // Station 1: Architecture Specification (COMPLETED)
  const s1 = mission.stations.find((s) => s.id === "task-01-spec");
  assert.ok(s1);
  assert.equal(s1.state, "COMPLETED");
  assert.equal(s1.lockPinsRaised, 0);

  // Station 2: Synthesize Backend Code (READY, depends on s1 which is COMPLETED -> 0 lock pins)
  const s2 = mission.stations.find((s) => s.id === "task-02-code");
  assert.ok(s2);
  assert.equal(s2.state, "READY");
  assert.equal(s2.lockPinsRaised, 0);
  assert.deepEqual(s2.incomingPrerequisites, ["task-01-spec"]);

  // Station 3: Deploy to Staging (PENDING, depends on s2 which is READY not COMPLETED -> 1 lock pin)
  const s3 = mission.stations.find((s) => s.id === "task-03-deploy");
  assert.ok(s3);
  assert.equal(s3.state, "PENDING");
  assert.equal(s3.lockPinsRaised, 1);
  assert.deepEqual(s3.incomingPrerequisites, ["task-02-code"]);
  assert.equal(s3.hasApprovalBarrier, true);
  assert.equal(s3.activeApprovalId, "appr-sec-01");

  // Routes verification
  assert.equal(mission.routes.length, 2);
  const r1 = mission.routes.find((r) => r.id === "route_task-01-spec_task-02-code");
  assert.ok(r1);
  assert.equal(r1.state, "SET_SOLID");

  // Signals verification
  const sig1 = mission.signals.find((s) => s.stationId === "task-01-spec");
  assert.ok(sig1);
  assert.equal(sig1.armPosition, "CLEAR_45_DOWN");
  assert.equal(sig1.lampState, "PALE_CLEAR");

  // Approvals verification
  assert.equal(mission.approvals.length, 1);
  assert.equal(mission.approvals[0].toolName, "terminal_tool");
  assert.equal(mission.approvals[0].riskLevel, "HIGH");

  // Memories verification
  assert.equal(result.archiveEntries.length, 1);
  assert.equal(result.archiveEntries[0].relevanceScore, 0.89);
});
