/**
 * AGENTIC OS — Spatial Camera Rig (Refined Phase B)
 * Spring-based camera with frameloop="demand" compatibility.
 * Tuned for 60-75% viewport occupancy and natural diagonal perspective.
 *
 * Perspective:
 * - Pitch: ~32° (slight elevation to reveal top info surfaces and depth).
 * - Yaw: -10° (gentle diagonal to reveal side chassis fins and sockets).
 * - Settle time: 250-350ms. Still when idle.
 */

"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpatialMissionStore } from "./state/useSpatialMissionStore";

// Spring constants — snappy 250-350ms settle
const SPRING_STIFFNESS = 0.095;
const SPRING_DAMPING = 0.74;
const SETTLE_THRESHOLD = 0.003;

// Default architectural perspective: pitch ~30°, yaw ~-14°
const DEFAULT_PITCH = (30 * Math.PI) / 180;
const DEFAULT_YAW = (-14 * Math.PI) / 180;

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

  const initPos = cameraPositionFromTarget(new THREE.Vector3(0, 0, 0), store.cameraDistance);
  const currentPos = useRef(initPos.clone());
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));
  const velocityPos = useRef(new THREE.Vector3(0, 0, 0));
  const velocityTarget = useRef(new THREE.Vector3(0, 0, 0));

  const goalPos = useRef(initPos.clone());
  const goalTarget = useRef(new THREE.Vector3(0, 0, 0));

  const lastFocusTrigger = useRef(store.focusTrigger);

  useEffect(() => {
    const tgt = new THREE.Vector3(...store.cameraTarget);
    const pos = cameraPositionFromTarget(tgt, store.cameraDistance);
    currentPos.current.copy(pos);
    currentTarget.current.copy(tgt);
    goalPos.current.copy(pos);
    goalTarget.current.copy(tgt);
    camera.position.copy(pos);
    camera.lookAt(tgt);
    invalidate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (store.focusTrigger !== lastFocusTrigger.current) {
      lastFocusTrigger.current = store.focusTrigger;
      const tgt = new THREE.Vector3(...store.cameraTarget);
      goalTarget.current.copy(tgt);
      goalPos.current.copy(cameraPositionFromTarget(tgt, store.cameraDistance));
      invalidate();
    }
  }, [store.focusTrigger, store.cameraTarget, store.cameraDistance, invalidate]);

  useFrame(() => {
    const deltaTarget = goalTarget.current.clone().sub(currentTarget.current);
    const deltaPos = goalPos.current.clone().sub(currentPos.current);

    const isTargetSettled =
      deltaTarget.length() < SETTLE_THRESHOLD &&
      velocityTarget.current.length() < SETTLE_THRESHOLD;
    const isPosSettled =
      deltaPos.length() < SETTLE_THRESHOLD &&
      velocityPos.current.length() < SETTLE_THRESHOLD;

    if (isTargetSettled && isPosSettled) {
      if (!currentTarget.current.equals(goalTarget.current)) {
        currentTarget.current.copy(goalTarget.current);
        currentPos.current.copy(goalPos.current);
        camera.position.copy(currentPos.current);
        camera.lookAt(currentTarget.current);
        invalidate();
      }
      return;
    }

    velocityTarget.current
      .add(deltaTarget.multiplyScalar(SPRING_STIFFNESS))
      .multiplyScalar(SPRING_DAMPING);
    currentTarget.current.add(velocityTarget.current);

    velocityPos.current
      .add(deltaPos.multiplyScalar(SPRING_STIFFNESS))
      .multiplyScalar(SPRING_DAMPING);
    currentPos.current.add(velocityPos.current);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);

    invalidate();
  });

  return null;
}
