/**
 * AGENTIC OS — Spatial Camera Rig
 * Spring-based camera with frameloop="demand" compatibility.
 * Camera only animates on explicit focus calls or user interaction.
 * Settles and stops invalidating when delta < 0.005.
 *
 * Motion rules:
 * - Normal focus: 250–350ms settle time
 * - Major scene transition: 350–500ms
 * - No idle drift, no ambient motion
 */

"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpatialMissionStore } from "./state/useSpatialMissionStore";

// Spring constants — tuned for 250-350ms settle on typical movements
const SPRING_STIFFNESS = 0.085;
const SPRING_DAMPING = 0.72;
const SETTLE_THRESHOLD = 0.005;

// Default orbital perspective: pitch ~35°, yaw ~-8°
const DEFAULT_PITCH = (35 * Math.PI) / 180;
const DEFAULT_YAW = (-8 * Math.PI) / 180;

function cameraPositionFromTarget(
  target: THREE.Vector3,
  distance: number,
  pitch: number = DEFAULT_PITCH,
  yaw: number = DEFAULT_YAW
): THREE.Vector3 {
  return new THREE.Vector3(
    target.x + distance * Math.cos(pitch) * Math.sin(yaw),
    target.y + distance * Math.sin(pitch),
    target.z + distance * Math.cos(pitch) * Math.cos(yaw)
  );
}

export function SpatialCameraRig() {
  const { camera, invalidate } = useThree();
  const store = useSpatialMissionStore();

  // Current animated position and look-at target
  const currentPos = useRef(new THREE.Vector3(0, 14, 18));
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));
  const velocityPos = useRef(new THREE.Vector3(0, 0, 0));
  const velocityTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Goal state derived from store
  const goalPos = useRef(new THREE.Vector3(0, 14, 18));
  const goalTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Track last focusTrigger to detect changes
  const lastFocusTrigger = useRef(store.focusTrigger);

  // On mount: set initial camera position
  useEffect(() => {
    const target = new THREE.Vector3(...store.cameraTarget);
    const pos = cameraPositionFromTarget(target, store.cameraDistance);
    currentPos.current.copy(pos);
    currentTarget.current.copy(target);
    camera.position.copy(pos);
    camera.lookAt(target);
    goalPos.current.copy(pos);
    goalTarget.current.copy(target);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When focusTrigger increments, update goal positions
  useEffect(() => {
    if (store.focusTrigger === lastFocusTrigger.current) return;
    lastFocusTrigger.current = store.focusTrigger;

    const target = new THREE.Vector3(...store.cameraTarget);
    const pos = cameraPositionFromTarget(target, store.cameraDistance);
    goalPos.current.copy(pos);
    goalTarget.current.copy(target);
    invalidate();
  }, [store.focusTrigger, store.cameraTarget, store.cameraDistance, invalidate]);

  useFrame(() => {
    let settling = false;

    // Spring towards goal position
    const dp = goalPos.current.clone().sub(currentPos.current);
    if (dp.length() > SETTLE_THRESHOLD) {
      velocityPos.current.add(dp.multiplyScalar(SPRING_STIFFNESS));
      velocityPos.current.multiplyScalar(SPRING_DAMPING);
      currentPos.current.add(velocityPos.current);
      settling = true;
    } else {
      velocityPos.current.set(0, 0, 0);
      currentPos.current.copy(goalPos.current);
    }

    // Spring towards goal look-at target
    const dt = goalTarget.current.clone().sub(currentTarget.current);
    if (dt.length() > SETTLE_THRESHOLD) {
      velocityTarget.current.add(dt.multiplyScalar(SPRING_STIFFNESS));
      velocityTarget.current.multiplyScalar(SPRING_DAMPING);
      currentTarget.current.add(velocityTarget.current);
      settling = true;
    } else {
      velocityTarget.current.set(0, 0, 0);
      currentTarget.current.copy(goalTarget.current);
    }

    // Apply to camera
    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);

    // Keep invalidating while spring is settling; stop when stable
    if (settling) {
      invalidate();
    }
  });

  return null;
}
