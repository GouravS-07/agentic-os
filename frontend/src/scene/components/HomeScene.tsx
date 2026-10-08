"use client";

import React from "react";
import { useSceneStore } from "../state/useSceneStore";
import { StudioLighting } from "./StudioLighting";
import { CameraController } from "./CameraController";
import { SculpturalMonolith3D } from "./SculpturalMonolith3D";

export const HomeScene: React.FC = () => {
  const selectEntity = useSceneStore((s) => s.selectEntity);
  const selectedEntity = useSceneStore((s) => s.selectedEntity);

  return (
    <>
      {/* High-End Studio Rim & Key Lighting (No Floor Grid) */}
      <StudioLighting />

      {/* Smooth Director Camera */}
      <CameraController />

      {/* ONE Single Dominant Computational Monolith */}
      <SculpturalMonolith3D position={[0, 0, 0]} />

      {/* Click ground plane to deselect */}
      <mesh
        position={[0, 0, -10]}
        onClick={() => {
          if (selectedEntity) selectEntity(null);
        }}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
};
