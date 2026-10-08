import test from "node:test";
import assert from "node:assert/strict";
import { handleIncomingEvent, parseDomainEvent } from "../events.ts";
import { reconcileMission, createInitialSceneModel } from "../reconcile.ts";
import { RECORDED_MISSION, RECORDED_TASKS_INITIAL } from "./fixtures/mission-data.ts";
import { FAILURE_LOOP_EVENTS } from "./fixtures/failure-loop-events.ts";

test("parseDomainEvent maps raw WebSocket event into typed SceneEvent", () => {
  const raw = FAILURE_LOOP_EVENTS[0];
  const parsed = parseDomainEvent(raw);

  assert.equal(parsed.id, "evt-001");
  assert.equal(parsed.eventType, "TASK_FAILED");
  assert.equal(parsed.sequenceNumber, 1);
  assert.equal(parsed.taskId, "task-02-code");
  assert.equal(parsed.payload.error, "Missing dependency: cannot find module 'pydantic_settings'");
});

test("handleIncomingEvent processes in-order events and patches SceneModel", () => {
  let model = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);
  assert.equal(model.lastSequenceNumber, 0);

  // Event 1: Task 2 fails
  const res1 = handleIncomingEvent(model, FAILURE_LOOP_EVENTS[0]);
  assert.equal(res1.type, "PROCESSED");
  if (res1.type === "PROCESSED") {
    model = res1.updatedModel;
    assert.equal(model.lastSequenceNumber, 1);
    const s2 = model.missions[RECORDED_MISSION.id].stations.find((s) => s.id === "task-02-code");
    assert.equal(s2?.state, "FAILED");
    assert.equal(s2?.retryCount, 1);

    const sig2 = model.missions[RECORDED_MISSION.id].signals.find((s) => s.stationId === "task-02-code");
    assert.equal(sig2?.lampState, "RED");
    assert.equal(sig2?.armPosition, "HORIZONTAL");
  }

  // Event 2: Failure analysis starts
  const res2 = handleIncomingEvent(model, FAILURE_LOOP_EVENTS[1]);
  assert.equal(res2.type, "PROCESSED");
  if (res2.type === "PROCESSED") {
    model = res2.updatedModel;
    assert.equal(model.lastSequenceNumber, 2);
  }
});

test("handleIncomingEvent ignores duplicate or stale sequence numbers", () => {
  let model = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);

  const res1 = handleIncomingEvent(model, FAILURE_LOOP_EVENTS[0]); // seq 1
  assert.equal(res1.type, "PROCESSED");
  if (res1.type === "PROCESSED") {
    model = res1.updatedModel;
  }

  // Re-send event 1 (duplicate)
  const resDuplicate = handleIncomingEvent(model, FAILURE_LOOP_EVENTS[0]);
  assert.equal(resDuplicate.type, "IGNORED_DUPLICATE");
});

test("handleIncomingEvent detects sequence gap and flags resync requirement", () => {
  let model = reconcileMission(createInitialSceneModel(), RECORDED_MISSION, RECORDED_TASKS_INITIAL);

  const res1 = handleIncomingEvent(model, FAILURE_LOOP_EVENTS[0]); // seq 1
  assert.equal(res1.type, "PROCESSED");
  if (res1.type === "PROCESSED") {
    model = res1.updatedModel;
  }

  // Skip event 2 (seq 2) and send event 3 (seq 3) -> Gap detected!
  const resGap = handleIncomingEvent(model, FAILURE_LOOP_EVENTS[2]);
  assert.equal(resGap.type, "SEQUENCE_GAP");
  if (resGap.type === "SEQUENCE_GAP") {
    assert.equal(resGap.expectedSeq, 2);
    assert.equal(resGap.receivedSeq, 3);
    assert.equal(resGap.missingCount, 1);
  }
});
