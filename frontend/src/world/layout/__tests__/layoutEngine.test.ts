import test from "node:test";
import assert from "node:assert/strict";
import { computeMissionLayout } from "../layoutEngine.ts";
import { RECORDED_MISSION, RECORDED_TASKS_INITIAL } from "../../adapter/__tests__/fixtures/mission-data.ts";

test("computeMissionLayout produces deterministic orthogonal layout with stations and tracks", async () => {
  const layout = await computeMissionLayout(RECORDED_MISSION, RECORDED_TASKS_INITIAL);

  assert.equal(layout.missionId, "mission-demo-001");
  assert.equal(layout.planVersion, 1);
  assert.equal(Object.keys(layout.stations).length, 3);
  assert.equal(layout.tracks.length, 2);

  // Stations are ordered from West to East (x increasing)
  const s1 = layout.stations["task-01-spec"];
  const s2 = layout.stations["task-02-code"];
  const s3 = layout.stations["task-03-deploy"];

  assert.ok(s1 && s2 && s3);
  assert.ok(s1.x < s2.x, "s1.x should be less than s2.x");
  assert.ok(s2.x < s3.x, "s2.x should be less than s3.x");

  // Track SVG paths contain 45° chamfers (M and L commands)
  layout.tracks.forEach((track) => {
    assert.ok(track.svgPath.startsWith("M "));
    assert.ok(track.svgPath.includes(" L "));
  });
});

test("computeMissionLayout creates lock plates and pins for multi-prerequisite tasks", async () => {
  const multiPrereqTasks = [
    { id: "task-1", mission_id: "m1", title: "Task 1", status: "COMPLETED", depends_on: [] },
    { id: "task-2", mission_id: "m1", title: "Task 2", status: "RUNNING", depends_on: [] },
    { id: "task-3", mission_id: "m1", title: "Task 3 (Join)", status: "PENDING", depends_on: ["task-1", "task-2"] },
  ];

  const layout = await computeMissionLayout({ id: "m1", title: "Join Test", status: "RUNNING" } as any, multiPrereqTasks as any);

  const joinStation = layout.stations["task-3"];
  assert.ok(joinStation);
  assert.equal(joinStation.isMultiPrereq, true);
  assert.equal(joinStation.lockPins.length, 2);

  // First pin (task-1) is satisfied because task-1 is COMPLETED
  const pin1 = joinStation.lockPins.find((p) => p.sourceTaskId === "task-1");
  assert.ok(pin1);
  assert.equal(pin1.isSatisfied, true);

  // Second pin (task-2) is NOT satisfied because task-2 is RUNNING
  const pin2 = joinStation.lockPins.find((p) => p.sourceTaskId === "task-2");
  assert.ok(pin2);
  assert.equal(pin2.isSatisfied, false);

  // Overall lock is NOT satisfied yet
  assert.equal(joinStation.allPrereqsSatisfied, false);

  // Lock plate exists
  const lockPlate = layout.lockPlates["task-3"];
  assert.ok(lockPlate);
  assert.equal(lockPlate.allSatisfied, false);
});
