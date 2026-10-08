import test from "node:test";
import assert from "node:assert/strict";
import { createInitialSceneModel, reconcileMission } from "../reconcile.ts";
import { handleIncomingEvent } from "../events.ts";
import { diffSceneModels } from "../diff.ts";
import { RECORDED_MISSION, RECORDED_TASKS_INITIAL } from "./fixtures/mission-data.ts";
import { FAILURE_LOOP_EVENTS } from "./fixtures/failure-loop-events.ts";

test("End-to-End Real Autonomous Replanning Scenario Contract Test", () => {
  // 1. Initial State: Mission loaded at Plan v1
  let model = reconcileMission(
    createInitialSceneModel(),
    RECORDED_MISSION,
    RECORDED_TASKS_INITIAL
  );
  model = { ...model, activeMissionId: RECORDED_MISSION.id };

  const missionId = RECORDED_MISSION.id;
  assert.equal(model.missions[missionId].planVersion, 1);
  assert.equal(model.missions[missionId].stations.length, 3);
  assert.equal(model.lastSequenceNumber, 0);

  // 2. Play all 10 recorded backend events through the event adapter
  for (let i = 0; i < FAILURE_LOOP_EVENTS.length; i++) {
    const rawEvent = FAILURE_LOOP_EVENTS[i];
    const prevModel = model;

    const result = handleIncomingEvent(model, rawEvent);
    assert.equal(result.type, "PROCESSED", `Event ${rawEvent.sequence_number} (${rawEvent.event_type}) should process cleanly`);

    if (result.type === "PROCESSED") {
      model = result.updatedModel;
      assert.equal(model.lastSequenceNumber, rawEvent.sequence_number);

      // Verify diff engine generates valid choreography ops between successive states
      const ops = diffSceneModels(prevModel, model);
      assert.ok(Array.isArray(ops));
    }
  }

  // 3. Verify Final State after full sequence completion:
  const mission = model.missions[missionId];
  assert.ok(mission);

  // - Plan version bumped to v2
  assert.equal(mission.planVersion, 2);

  // - 4 stations now present (Spec, Code, Deploy, plus Recovery)
  assert.equal(mission.stations.length, 4);

  // - Recovery task is COMPLETED with output data
  const recTask = mission.stations.find((s) => s.id === "task-rec-01");
  assert.ok(recTask, "Recovery station must exist in SceneModel");
  assert.equal(recTask.isRecovery, true);
  assert.equal(recTask.state, "COMPLETED");
  assert.deepEqual(recTask.outputData, { installed: "pydantic-settings==2.1.0" });

  // - Original task 2 is in READY state after retry unlocked
  const task2 = mission.stations.find((s) => s.id === "task-02-code");
  assert.ok(task2);
  assert.equal(task2.state, "READY");
  assert.equal(task2.retryCount, 1);

  // - Signal for task 2 is cleared
  const sig2 = mission.signals.find((s) => s.stationId === "task-02-code");
  assert.ok(sig2);
  assert.equal(sig2.armPosition, "CLEAR_45_DOWN");
  assert.equal(sig2.lampState, "PALE_CLEAR");

  // - Retrieved memory is present in archive
  assert.ok(model.archiveEntries.length > 0);
  assert.equal(model.archiveEntries[0].id, "mem-exp-01");

  // - Final sequence number matches backend sequence
  assert.equal(model.lastSequenceNumber, 10);
  assert.equal(model.hasPendingGapResync, false);
});
