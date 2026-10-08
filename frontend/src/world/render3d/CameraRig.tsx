"use client";

import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "../state/worldStore";

/**
 * Interlocking Camera Rig
 * Low FOV (~22°), near-axonometric camera with semantic zoom levels (BOARD -> DISTRICT -> SHEET -> STATION).
 * STRICT RULE: No constant idle camera drift; motion occurs only on state transition or user input.
 */
export const CameraRig: React.FC = () => {
  const { camera, gl, invalidate } = useThree();
  const {
    cameraPose,
    updateCameraPose,
    zoomLevel,
    setZoomLevel,
    closeMissionSheet,
  } = useWorldStore();

  const currentTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.5, 0));
  const isInteracting = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pointerNorm = useRef({ x: 0, y: 0 });
  const parallaxOffset = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });

  // Invalidate when cameraPose changes
  useEffect(() => {
    invalidate();
  }, [cameraPose, invalidate]);

  // Handle keyboard navigation at camera level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomLevel === "SHEET" || zoomLevel === "STATION") {
          closeMissionSheet();
        } else if (zoomLevel === "DISTRICT") {
          setZoomLevel("BOARD");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomLevel, closeMissionSheet, setZoomLevel]);

  // Handle pointer pan, wheel zoom, and parallax tracking
  useEffect(() => {
    const dom = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isInteracting.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      invalidate();
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Track normalized mouse position for subtle dynamic parallax (-1 to 1)
      const rect = dom.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerNorm.current = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };

      invalidate();

      if (!isInteracting.current) return;
      const dx = (e.clientX - dragStart.current.x) * 0.25;
      const dy = (e.clientY - dragStart.current.y) * 0.25;
      dragStart.current = { x: e.clientX, y: e.clientY };

      const [tx, ty, tz] = cameraPose.target;
      updateCameraPose({
        target: [tx - dx, ty, tz - dy],
      });
    };

    const handlePointerUp = () => {
      isInteracting.current = false;
      invalidate();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? -12 : 12;
      const newDistance = Math.min(Math.max(cameraPose.distance + delta, 26), 260);
      updateCameraPose({ distance: newDistance });
      invalidate();
    };

    dom.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      dom.removeEventListener("wheel", handleWheel);
    };
  }, [camera, gl, cameraPose, updateCameraPose, invalidate]);

  useFrame((_, delta) => {
    const [tx, ty, tz] = cameraPose.target;
    const targetVec = new THREE.Vector3(tx, ty, tz);

    // Responsive expo-out travel speed (~350ms feel)
    const lerpSpeed = 1 - Math.exp(-delta * 8.5);
    currentTarget.current.lerp(targetVec, lerpSpeed);

    // Subtle pointer parallax smoothly interpolated
    const targetParallaxX = pointerNorm.current.x * 2.8;
    const targetParallaxY = pointerNorm.current.y * 1.6;
    const targetParallaxYaw = pointerNorm.current.x * 3.5;
    const targetParallaxPitch = -pointerNorm.current.y * 2.0;

    parallaxOffset.current.x += (targetParallaxX - parallaxOffset.current.x) * (delta * 6.0);
    parallaxOffset.current.y += (targetParallaxY - parallaxOffset.current.y) * (delta * 6.0);
    parallaxOffset.current.yaw += (targetParallaxYaw - parallaxOffset.current.yaw) * (delta * 6.0);
    parallaxOffset.current.pitch += (targetParallaxPitch - parallaxOffset.current.pitch) * (delta * 6.0);

    // Spherical coordinate offset (pitch, yaw, distance)
    const effectivePitch = THREE.MathUtils.clamp(cameraPose.pitch + parallaxOffset.current.pitch, 12, 85);
    const effectiveYaw = THREE.MathUtils.clamp(cameraPose.yaw + parallaxOffset.current.yaw, -35, 35);
    const pitchRad = THREE.MathUtils.degToRad(effectivePitch);
    const yawRad = THREE.MathUtils.degToRad(effectiveYaw);
    const dist = cameraPose.distance;

    const camX = currentTarget.current.x + parallaxOffset.current.x + dist * Math.sin(yawRad) * Math.cos(pitchRad);
    const camY = currentTarget.current.y + parallaxOffset.current.y + dist * Math.sin(pitchRad);
    const camZ = currentTarget.current.z + dist * Math.cos(yawRad) * Math.cos(pitchRad);

    const destVec = new THREE.Vector3(camX, camY, camZ);
    const posDiff = camera.position.distanceTo(destVec);
    const targetDiff = currentTarget.current.distanceTo(targetVec);

    camera.position.lerp(destVec, lerpSpeed);
    camera.lookAt(currentTarget.current);

    // Keep invalidating if the camera is still in motion; stop completely once settled
    if (posDiff > 0.01 || targetDiff > 0.01) {
      invalidate();
    }
  });

  return null;
};
