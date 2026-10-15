import test from "node:test";
import assert from "node:assert/strict";
import { createInitialSceneModel, reconcileMission } from "../reconcile.ts";
import { RECORDED_MISSION, RECORDED_TASKS_INITIAL } from "./fixtures/mission-data.ts";

test("Phase E: Initial Plan v1 contains zero recovery routes and zero recovery stations", () => {
  const initial = createInitialSceneModel();
  const result = reconcileMission(
    initial,
    RECORDED_MISSION,
    RECORDED_TASKS_INITIAL,
    [],
    [],
    []
  );

  const mission = result.missions[RECORDED_MISSION.id];
  assert.ok(mission);
  assert.equal(mission.planVersion, 1);
  assert.equal(mission.stations.length, 3);

  // None of the initial stations should be recovery
  mission.stations.forEach((s) => {
    assert.equal(s.isRecovery, false, `Station ${s.id} should not be marked as recovery in initial plan`);
  });

  // None of the initial routes should be RECOVERY_DASHED
  mission.routes.forEach((r) => {
    assert.notEqual(r.state, "RECOVERY_DASHED", `Route ${r.id} should not be RECOVERY_DASHED in initial plan`);
    assert.equal(r.hasSwitchBlade, false, `Route ${r.id} should not have switch blade thrown in initial plan`);
  });
});

test("Phase E: v1-to-v2 revision highlights exactly one genuinely new recovery edge while preserving baseline edges", () => {
  const initial = createInitialSceneModel();

  // Revised plan tasks (post-replan)
  const REVISED_TASKS = [
    ...RECORDED_TASKS_INITIAL.map((t) => {
      if (t.id === "task-02-code") {
        return {
          ...t,
          status: "READY",
          retry_count: 1,
          dependencies: ["task-01-spec", "task-rec-01"],
        };
      }
      return t;
    }),
    {
      id: "task-rec-01",
      mission_id: "mission-demo-001",
      title: "Fix & Recover: Install native sharp bindings",
      description: "Compile and bundle native binaries for environment.",
      status: "COMPLETED",
      priority: 2,
      assigned_agent_id: "agent_executor",
      dependencies: [],
      retry_count: 0,
      max_retries: 3,
      output_data: { installed: "sharp@0.33.2" },
    },
  ];

  const REVISED_MISSION = {
    ...RECORDED_MISSION,
    plan_version: 2,
    replan_count: 1,
  };

  // Real backend payload structure:
  // plan_snapshot.version = 2 (new plan), plan_snapshot.tasks = REVISED_TASKS (5 tasks)
  // plan_snapshot.previous_plan = { version: 1, tasks: RECORDED_TASKS_INITIAL }
  const REVISIONS = [
    {
      version: 2,
      parent_version: 1,
      strategy: "CREATE_RECOVERY_TASK",
      reason: "Injected recovery task 'Fix & Recover: Install native sharp bindings' to resolve DEPENDENCY_FAILURE",
      created_at: new Date().toISOString(),
      plan_snapshot: {
        version: 2,
        tasks: REVISED_TASKS,
        previous_plan: {
          version: 1,
          tasks: RECORDED_TASKS_INITIAL,
        },
      },
    },
  ];

  const result = reconcileMission(
    initial,
    REVISED_MISSION,
    REVISED_TASKS,
    [],
    REVISIONS,
    []
  );

  const mission = result.missions[REVISED_MISSION.id];
  assert.ok(mission);
  assert.equal(mission.planVersion, 2);
  assert.equal(mission.stations.length, 4);

  // Recovery station verification
  const recStation = mission.stations.find((s) => s.id === "task-rec-01");
  assert.ok(recStation);
  assert.equal(recStation.isRecovery, true);

  // Baseline route: task-01 -> task-02 was present in parent plan, must remain SET_SOLID
  const baselineRoute = mission.routes.find((r) => r.id === "route_task-01-spec_task-02-code");
  assert.ok(baselineRoute);
  assert.equal(baselineRoute.state, "SET_SOLID");
  assert.equal(baselineRoute.hasSwitchBlade, false);

  // Proven dynamic recovery route: task-rec-01 -> task-02 was absent in parent plan, MUST be RECOVERY_DASHED
  const recoveryRoute = mission.routes.find((r) => r.id === "route_task-rec-01_task-02-code");
  assert.ok(recoveryRoute, "Route for newly injected recovery dependency must exist");
  assert.equal(recoveryRoute.state, "RECOVERY_DASHED");
  assert.equal(recoveryRoute.hasSwitchBlade, true);
});

test("Phase E: An edge removed from the parent plan is omitted and rewired edge is marked", () => {
  const initial = createInitialSceneModel();

  // In parent plan, task-03 depended on task-02.
  // In revised plan, task-03 dependency is changed to task-01 only (edge task-02 -> task-03 is removed).
  const REWIRED_TASKS = [
    RECORDED_TASKS_INITIAL[0], // task-01-spec
    RECORDED_TASKS_INITIAL[1], // task-02-code (depends on task-01)
    {
      ...RECORDED_TASKS_INITIAL[2],
      id: "task-03-deploy",
      dependencies: ["task-01-spec"], // Rewired: removed task-02-code, added task-01-spec
      status: "READY",
    },
  ];

  const REVISIONS = [
    {
      version: 2,
      parent_version: 1,
      strategy: "MODIFY_PLAN",
      reason: "Bypassed intermediate step to unblock critical path",
      created_at: new Date().toISOString(),
      plan_snapshot: {
        version: 2,
        tasks: REWIRED_TASKS,
        previous_plan: {
          version: 1,
          tasks: RECORDED_TASKS_INITIAL,
        },
      },
    },
  ];

  const result = reconcileMission(
    initial,
    { ...RECORDED_MISSION, plan_version: 2, replan_count: 1 },
    REWIRED_TASKS,
    [],
    REVISIONS,
    []
  );

  const mission = result.missions[RECORDED_MISSION.id];
  assert.ok(mission);

  // Edge task-02 -> task-03 was removed: must not exist in current routes
  const removedEdge = mission.routes.find((r) => r.id === "route_task-02-code_task-03-deploy");
  assert.equal(removedEdge, undefined, "Removed edge must not be present in active routes");

  // New edge task-01 -> task-03 was absent in parent plan: must be RECOVERY_DASHED
  const newEdge = mission.routes.find((r) => r.id === "route_task-01-spec_task-03-deploy");
  assert.ok(newEdge, "Rewired edge must exist");
  assert.equal(newEdge.state, "RECOVERY_DASHED");
  assert.equal(newEdge.hasSwitchBlade, true);

  // Baseline edge task-01 -> task-02 was in parent plan: must remain SET_SOLID
  const baselineEdge = mission.routes.find((r) => r.id === "route_task-01-spec_task-02-code");
  assert.ok(baselineEdge);
  assert.equal(baselineEdge.state, "SET_SOLID");
  assert.equal(baselineEdge.hasSwitchBlade, false);
});

test("Phase E: Missing historical parent-snapshot does not falsely claim edges are rewired", () => {
  const initial = createInitialSceneModel();

  // Legacy revision payload that lacks previous_plan
  const LEGACY_REVISIONS = [
    {
      version: 2,
      parent_version: 1,
      strategy: "CREATE_RECOVERY_TASK",
      reason: "Legacy replan without pre-mutation snapshot",
      created_at: new Date().toISOString(),
      plan_snapshot: {
        version: 2,
        tasks: RECORDED_TASKS_INITIAL,
      },
    },
  ];

  const result = reconcileMission(
    initial,
    { ...RECORDED_MISSION, plan_version: 2, replan_count: 1 },
    RECORDED_TASKS_INITIAL,
    [],
    LEGACY_REVISIONS,
    []
  );

  const mission = result.missions[RECORDED_MISSION.id];
  assert.ok(mission);

  // Since parent snapshot is missing, adapter must NOT falsely claim routes are RECOVERY_DASHED
  mission.routes.forEach((r) => {
    assert.notEqual(r.state, "RECOVERY_DASHED", `Route ${r.id} should not be marked as rewired when parent snapshot is absent`);
    assert.equal(r.hasSwitchBlade, false);
  });
});

test("Phase E: Multiple revisions compare against the immediate parent revision", () => {
  const initial = createInitialSceneModel();

  // Plan v1: task-01 -> task-02 -> task-03
  // Plan v2: added task-rec-01 (task-rec-01 -> task-02)
  const V2_TASKS = [
    ...RECORDED_TASKS_INITIAL.map((t) => (t.id === "task-02-code" ? { ...t, dependencies: ["task-01-spec", "task-rec-01"] } : t)),
    {
      id: "task-rec-01",
      mission_id: "mission-demo-001",
      title: "Fix & Recover: First recovery",
      status: "COMPLETED",
      dependencies: [],
    },
  ];

  // Plan v3: added task-rec-02 (task-rec-02 -> task-03)
  const V3_TASKS = [
    ...V2_TASKS.map((t) => (t.id === "task-03-deploy" ? { ...t, dependencies: ["task-02-code", "task-rec-02"] } : t)),
    {
      id: "task-rec-02",
      mission_id: "mission-demo-001",
      title: "Fix & Recover: Second recovery",
      status: "READY",
      dependencies: [],
    },
  ];

  const MULTI_REVISIONS = [
    {
      version: 2,
      parent_version: 1,
      strategy: "CREATE_RECOVERY_TASK",
      reason: "Replan v1 -> v2",
      created_at: new Date().toISOString(),
      plan_snapshot: {
        version: 2,
        tasks: V2_TASKS,
        previous_plan: { version: 1, tasks: RECORDED_TASKS_INITIAL },
      },
    },
    {
      version: 3,
      parent_version: 2,
      strategy: "CREATE_RECOVERY_TASK",
      reason: "Replan v2 -> v3",
      created_at: new Date().toISOString(),
      plan_snapshot: {
        version: 3,
        tasks: V3_TASKS,
        previous_plan: { version: 2, tasks: V2_TASKS },
      },
    },
  ];

  const result = reconcileMission(
    initial,
    { ...RECORDED_MISSION, plan_version: 3, replan_count: 2 },
    V3_TASKS,
    [],
    MULTI_REVISIONS,
    []
  );

  const mission = result.missions[RECORDED_MISSION.id];
  assert.ok(mission);
  assert.equal(mission.planVersion, 3);

  // In v3, the newly added edge is task-rec-02 -> task-03: MUST be RECOVERY_DASHED
  const edgeV3 = mission.routes.find((r) => r.id === "route_task-rec-02_task-03-deploy");
  assert.ok(edgeV3);
  assert.equal(edgeV3.state, "RECOVERY_DASHED");
  assert.equal(edgeV3.hasSwitchBlade, true);

  // The edge task-rec-01 -> task-02 was ALREADY present in Plan v2 (parent of v3): MUST be SET_SOLID
  const edgeV2 = mission.routes.find((r) => r.id === "route_task-rec-01_task-02-code");
  assert.ok(edgeV2);
  assert.equal(edgeV2.state, "SET_SOLID");
  assert.equal(edgeV2.hasSwitchBlade, false);

  // Baseline edge task-01 -> task-02 was present in both: MUST be SET_SOLID
  const edgeV1 = mission.routes.find((r) => r.id === "route_task-01-spec_task-02-code");
  assert.ok(edgeV1);
  assert.equal(edgeV1.state, "SET_SOLID");
  assert.equal(edgeV1.hasSwitchBlade, false);
});
