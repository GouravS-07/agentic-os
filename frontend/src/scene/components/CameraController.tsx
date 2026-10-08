"use client";

import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/useSceneStore";

export function CameraController() {
  const { camera, pointer } = useThree();
  const targetCameraPose = useSceneStore((s) => s.targetCameraPose);
  const currentTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    // 1. Target coordinates
    const [tx, ty, tz] = targetCameraPose.position;
    const [lx, ly, lz] = targetCameraPose.target;
    const speed = targetCameraPose.transitionSpeed || 2.0;

    // 2. Mouse Parallax (subtle, restrained depth)
    const parallaxX = pointer.x * 0.45;
    const parallaxY = pointer.y * 0.35;

    const desiredX = tx + parallaxX;
    const desiredY = ty + parallaxY;
    const desiredZ = tz;

    // 3. Smooth Lerp with delta compensation
    const lerpFactor = Math.min(delta * speed, 0.15);
    camera.position.x += (desiredX - camera.position.x) * lerpFactor;
    camera.position.y += (desiredY - camera.position.y) * lerpFactor;
    camera.position.z += (desiredZ - camera.position.z) * lerpFactor;

    // 4. Lerp lookAt target
    currentTargetRef.current.x += (lx - currentTargetRef.current.x) * lerpFactor;
    currentTargetRef.current.y += (ly - currentTargetRef.current.y) * lerpFactor;
    currentTargetRef.current.z += (lz - currentTargetRef.current.z) * lerpFactor;

    camera.lookAt(currentTargetRef.current);
  });

  return null;
}
