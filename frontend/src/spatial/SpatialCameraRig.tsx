/**
 * AGENTIC OS — Spatial Camera Rig (Phase C)
 * Authored camera transition runner with quart-out easing (320ms duration).
 * frameloop="demand" compatible — actively invalidates only during transitions, still at rest.
 *
 * Perspective:
 * - OVERVIEW: Pitch ~30°, Yaw ~-14° (full DAG readable)
 * - TASK FOCUS: Pitch ~32°, Yaw ~-18° (3/4 dramatic angle framing front placard, core rails, port sockets)
 * - DEPENDENCY FOCUS: Pitch ~33°, Yaw ~-14° (framed group of selected + prerequisites + dependents)
 */

"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpatialMissionStore } from "./state/useSpatialMissionStore";

// Transition Duration in ms (250–400ms range)
const TRANSITION_DURATION_MS = 320;

function cameraPositionFromTarget(
  target: THREE.Vector3,
  distance: number,
  pitch: number,
  yaw: number
): THREE.Vector3 {
  return new THREE.Vector3(
    target.x + distance * Math.cos(pitch) * Math.sin(yaw),
    target.y + distance * Math.sin(pitch),
    target.z + distance * Math.cos(pitch) * Math.cos(yaw)
  );
}

// Quartic out easing: f(t) = 1 - (1 - t)^4
function easeQuartOut(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv * inv;
}

export function SpatialCameraRig() {
  const { camera, invalidate } = useThree();
  const store = useSpatialMissionStore();

  const initTarget = new THREE.Vector3(...store.cameraTarget);
  const initPos = cameraPositionFromTarget(
    initTarget,
    store.cameraDistance,
    store.cameraPitch,
    store.cameraYaw
  );

  const currentPos = useRef(initPos.clone());
  const currentTarget = useRef(initTarget.clone());

  // Transition state
  const isTransitioning = useRef(false);
  const transitionStartTime = useRef(0);
  const startPos = useRef(initPos.clone());
  const startTarget = useRef(initTarget.clone());
  const goalPos = useRef(initPos.clone());
  const goalTarget = useRef(initTarget.clone());

  const lastFocusTrigger = useRef(store.focusTrigger);

  // Initialize camera position on mount
  useEffect(() => {
    const tgt = new THREE.Vector3(...store.cameraTarget);
    const pos = cameraPositionFromTarget(
      tgt,
      store.cameraDistance,
      store.cameraPitch,
      store.cameraYaw
    );
    currentPos.current.copy(pos);
    currentTarget.current.copy(tgt);
    goalPos.current.copy(pos);
    goalTarget.current.copy(tgt);
    camera.position.copy(pos);
    camera.lookAt(tgt);
    invalidate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retarget whenever focusTrigger fires
  useEffect(() => {
    if (store.focusTrigger !== lastFocusTrigger.current) {
      lastFocusTrigger.current = store.focusTrigger;

      // Retarget immediately from wherever current camera is right now
      startPos.current.copy(camera.position);
      startTarget.current.copy(currentTarget.current);

      const targetVec = new THREE.Vector3(...store.cameraTarget);
      goalTarget.current.copy(targetVec);
      goalPos.current.copy(
        cameraPositionFromTarget(
          targetVec,
          store.cameraDistance,
          store.cameraPitch,
          store.cameraYaw
        )
      );

      transitionStartTime.current = performance.now();
      isTransitioning.current = true;
      invalidate();
    }
  }, [
    store.focusTrigger,
    store.cameraTarget,
    store.cameraDistance,
    store.cameraPitch,
    store.cameraYaw,
    camera,
    invalidate,
  ]);

  useFrame(() => {
    if (!isTransitioning.current) return;

    const now = performance.now();
    const elapsed = now - transitionStartTime.current;
    const rawProgress = Math.min(1, Math.max(0, elapsed / TRANSITION_DURATION_MS));
    const easedProgress = easeQuartOut(rawProgress);

    currentPos.current.lerpVectors(startPos.current, goalPos.current, easedProgress);
    currentTarget.current.lerpVectors(startTarget.current, goalTarget.current, easedProgress);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);

    if (rawProgress >= 1) {
      // Transition complete: latch precisely to goal and rest
      isTransitioning.current = false;
      camera.position.copy(goalPos.current);
      camera.lookAt(goalTarget.current);
      invalidate();
    } else {
      // Keep requesting frames while in motion
      invalidate();
    }
  });

  return null;
}
