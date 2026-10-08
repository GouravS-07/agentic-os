import test from "node:test";
import assert from "node:assert/strict";
import { diffSceneModels } from "../diff.ts";
import { createInitialSceneModel, reconcileMission } from "../reconcile.ts";
import { RECORDED_MISSION, RECORDED_TASKS_INITIAL } from "./fixtures/mission-data.ts";

test("diffSceneModels emits UNFOLD_MISSION_SHEET when mission is activated", () => {
  const prev = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);
  const next = { ...prev, activeMissionId: RECORDED_MISSION.id };

  const ops = diffSceneModels(prev, next);
  assert.ok(ops.some((op) => op.type === "UNFOLD_MISSION_SHEET" && op.targetId === RECORDED_MISSION.id));
});

test("diffSceneModels emits TASK_FAILED and SIGNAL_DANGER when station fails", () => {
  const initial = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);
  const activeInitial = { ...initial, activeMissionId: RECORDED_MISSION.id };

  // Mutate task-02 to FAILED
  const failedTasks = RECORDED_TASKS_INITIAL.map((t) =>
    t.id === "task-02-code" ? { ...t, status: "FAILED", error_message: "Compilation error" } : t
  );
  const failedModel = reconcileMission(activeInitial, RECORDED_MISSION, failedTasks);

  const ops = diffSceneModels(activeInitial, failedModel);
  assert.ok(ops.some((op) => op.type === "TASK_FAILED" && op.targetId === "task-02-code"));
  assert.ok(ops.some((op) => op.type === "SIGNAL_DANGER" && op.targetId === "task-02-code"));
});

test("diffSceneModels emits THROW_SWITCH_BLADE and RISE_RECOVERY_STATION when recovery task is injected", () => {
  const initial = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);
  const activeInitial = { ...initial, activeMissionId: RECORDED_MISSION.id };

  const replannedTasks = [
    ...RECORDED_TASKS_INITIAL,
    {
      id: "task-rec-01",
      mission_id: RECORDED_MISSION.id,
      title: "Fix & Recover: 2. Synthesize Backend Code",
      status: "READY",
      priority: 2,
      assigned_agent_id: "agent_executor",
      dependencies: [],
      retry_count: 0,
      max_retries: 3,
    },
  ];

  const replannedMission = {
    ...RECORDED_MISSION,
    plan_version: 2,
    replan_count: 1,
  };

  const nextModel = reconcileMission(activeInitial, replannedMission, replannedTasks);
  const ops = diffSceneModels(activeInitial, nextModel);

  assert.ok(ops.some((op) => op.type === "THROW_SWITCH_BLADE" && op.targetId === "task-rec-01"));
  assert.ok(ops.some((op) => op.type === "RISE_RECOVERY_STATION" && op.targetId === "task-rec-01"));
  assert.ok(ops.some((op) => op.type === "FLIP_SPLIT_FLAP_VERSION" && op.targetId === RECORDED_MISSION.id));
  assert.ok(ops.some((op) => op.type === "EASE_STATIONS_REPLAN" && op.targetId === RECORDED_MISSION.id));
});

test("diffSceneModels emits DISPATCH_AGENT_CARRIER when agent starts task", () => {
  const initial = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);
  const next = {
    ...initial,
    agents: {
      ...initial.agents,
      agent_coder: {
        ...initial.agents.agent_coder,
        status: "BUSY" as const,
        carrierStatus: "WORKING_STATION" as const,
        currentStationId: "task-02-code",
        lampLit: true,
      },
    },
  };

  const ops = diffSceneModels(initial, next);
  assert.ok(ops.some((op) => op.type === "DISPATCH_AGENT_CARRIER" && op.targetId === "agent_coder"));
});
