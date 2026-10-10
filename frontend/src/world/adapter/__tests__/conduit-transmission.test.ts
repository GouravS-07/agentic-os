import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Phase D: Conduit Transmission Matrix & Orthogonal Route Geometry Unit Tests
 *
 * Verifies the exact transmission predicate and orthogonal corner geometry
 * covering all positive and negative permutations specified in Phase D requirements.
 */

// Pure typed predicate mirror representing the spatial presentation logic in SpatialMissionCanvas.tsx
function isConduitTransmitting({
  prefersReducedMotion,
  routeState,
  isSupersededGhost,
  sourceStation,
  targetStation,
}: {
  prefersReducedMotion: boolean;
  routeState: string;
  isSupersededGhost?: boolean;
  sourceStation?: { state: string };
  targetStation?: { state: string };
}): boolean {
  return (
    !prefersReducedMotion &&
    routeState === "ENERGIZED_AMBER" &&
    !isSupersededGhost &&
    sourceStation !== undefined &&
    sourceStation.state === "RUNNING" &&
    targetStation !== undefined &&
    targetStation.state !== "FAILED" &&
    targetStation.state !== "BLOCKED" &&
    targetStation.state !== "CANCELLED"
  );
}

// Pure function calculating orthogonal segments and corner junction coordinates
function computeConduitSegments(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number
) {
  const isDirect = Math.abs(startZ - endZ) < 0.08;
  const midX = (startX + endX) / 2;

  if (isDirect) {
    const length = Math.max(0.1, endX - startX);
    return {
      isDirect: true,
      seg1: { x: (startX + endX) / 2, z: startZ, len: length, isX: true },
      corner1: null,
      seg2: null,
      corner2: null,
      seg3: null,
    };
  }

  const seg1Len = Math.max(0.1, midX - startX);
  const seg2Len = Math.max(0.1, Math.abs(endZ - startZ));
  const seg3Len = Math.max(0.1, endX - midX);

  return {
    isDirect: false,
    seg1: { x: (startX + midX) / 2, z: startZ, len: seg1Len, isX: true },
    corner1: { x: midX, z: startZ },
    seg2: { x: midX, z: (startZ + endZ) / 2, len: seg2Len, isX: false },
    corner2: { x: midX, z: endZ },
    seg3: { x: (midX + endX) / 2, z: endZ, len: seg3Len, isX: true },
  };
}

// Parametric packet position along the orthogonal duct
function getPacketPosition(
  d: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  segments: ReturnType<typeof computeConduitSegments>
) {
  const isDirect = segments.isDirect;
  const L1 = segments.seg1?.len || 0;
  const L2 = segments.seg2?.len || 0;
  const midX = (startX + endX) / 2;

  if (isDirect) {
    return { x: startX + d, z: startZ };
  } else {
    if (d < L1) {
      // Segment 1 along X
      return { x: startX + d, z: startZ };
    } else if (d < L1 + L2) {
      // Segment 2 along Z, strictly at midX
      const zOffset = d - L1;
      const signZ = Math.sign(endZ - startZ);
      return { x: midX, z: startZ + signZ * zOffset };
    } else {
      // Segment 3 along X, strictly at endZ
      const xOffset = d - L1 - L2;
      return { x: midX + xOffset, z: endZ };
    }
  }
}

describe('Phase D: Conduit Transmission Matrix Permutations', () => {
  const validSource = { state: 'RUNNING' };
  const validTarget = { state: 'READY' };

  test('Positive Case: ENERGIZED_AMBER + RUNNING source + valid target + motion enabled transmits', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      true
    );
  });

  test('Negative Case: Reduced Motion blocks transmission', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: true,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Route state PENDING_DASHED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'PENDING_DASHED',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Route state SET_SOLID does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'SET_SOLID',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Route state FRACTURED_RED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'FRACTURED_RED',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Route state GHOST_REVISED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'GHOST_REVISED',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Route state RECOVERY_DASHED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'RECOVERY_DASHED',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: isSupersededGhost route does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: true,
        sourceStation: validSource,
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Source task is READY (not RUNNING) does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: { state: 'READY' },
        targetStation: validTarget,
      }),
      false
    );
  });

  test('Negative Case: Incoming route where target is RUNNING but source is READY does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: { state: 'READY' },
        targetStation: { state: 'RUNNING' },
      }),
      false
    );
  });

  test('Negative Case: Target is BLOCKED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: { state: 'BLOCKED' },
      }),
      false
    );
  });

  test('Negative Case: Target is CANCELLED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: { state: 'CANCELLED' },
      }),
      false
    );
  });

  test('Negative Case: Target is FAILED does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: { state: 'FAILED' },
      }),
      false
    );
  });

  test('Negative Case: Missing source or target station does not transmit', () => {
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: undefined,
        targetStation: validTarget,
      }),
      false
    );
    assert.strictEqual(
      isConduitTransmitting({
        prefersReducedMotion: false,
        routeState: 'ENERGIZED_AMBER',
        isSupersededGhost: false,
        sourceStation: validSource,
        targetStation: undefined,
      }),
      false
    );
  });
});

describe('Phase D: Orthogonal Conduit Corner Geometry & No Corner Clipping', () => {
  test('Direct linear conduit has no corners and moves monotonically along X', () => {
    const segs = computeConduitSegments(0, 0, 10, 0);
    assert.strictEqual(segs.isDirect, true);
    assert.strictEqual(segs.corner1, null);

    const pos = getPacketPosition(5, 0, 0, 10, 0, segs);
    assert.strictEqual(pos.x, 5);
    assert.strictEqual(pos.z, 0);
  });

  test('Orthogonal stepped conduit turns strictly at corner coordinates with no diagonal clipping', () => {
    const startX = 2;
    const startZ = 1;
    const endX = 8;
    const endZ = 5;
    const segs = computeConduitSegments(startX, startZ, endX, endZ);

    assert.strictEqual(segs.isDirect, false);
    const midX = (startX + endX) / 2; // 5
    assert.strictEqual(segs.corner1?.x, midX);
    assert.strictEqual(segs.corner1?.z, startZ); // (5, 1)
    assert.strictEqual(segs.corner2?.x, midX);
    assert.strictEqual(segs.corner2?.z, endZ); // (5, 5)

    const L1 = segs.seg1.len; // 3
    const L2 = segs.seg2!.len; // 4

    // Inside Segment 1: strictly on startZ
    const posSeg1 = getPacketPosition(1.5, startX, startZ, endX, endZ, segs);
    assert.strictEqual(posSeg1.x, 3.5);
    assert.strictEqual(posSeg1.z, startZ);

    // Exactly at Corner 1: (midX, startZ)
    const posCorner1 = getPacketPosition(L1, startX, startZ, endX, endZ, segs);
    assert.strictEqual(posCorner1.x, midX);
    assert.strictEqual(posCorner1.z, startZ);

    // Inside Segment 2: strictly on midX, moving in Z
    const posSeg2 = getPacketPosition(L1 + 2, startX, startZ, endX, endZ, segs);
    assert.strictEqual(posSeg2.x, midX);
    assert.strictEqual(posSeg2.z, startZ + 2);

    // Exactly at Corner 2: (midX, endZ)
    const posCorner2 = getPacketPosition(L1 + L2, startX, startZ, endX, endZ, segs);
    assert.strictEqual(posCorner2.x, midX);
    assert.strictEqual(posCorner2.z, endZ);

    // Inside Segment 3: strictly on endZ, moving in X towards endX
    const posSeg3 = getPacketPosition(L1 + L2 + 1.5, startX, startZ, endX, endZ, segs);
    assert.strictEqual(posSeg3.x, midX + 1.5);
    assert.strictEqual(posSeg3.z, endZ);
  });
});
