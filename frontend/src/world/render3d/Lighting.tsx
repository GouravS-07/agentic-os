"use client";

import React from "react";
import { useWorldStore } from "../state/worldStore";

/**
 * Precision Industrial Studio Lighting
 * Controlled directional key light with contact shadows, crisp metallic rim highlights,
 * and subtle soft fill for ivory and graphite material separation.
 */
export const Lighting: React.FC = () => {
  const { qualityTier } = useWorldStore();
  const isHighQuality = qualityTier === "HIGH";

  return (
    <group name="studio-lighting">
      {/* 1. Neutral Ambient Fill */}
      <ambientLight intensity={0.52} color="#FFFFFF" />

      {/* 2. Strong Directional Key from North-West */}
      <directionalLight
        position={[-100, 160, -90]}
        intensity={1.4}
        color="#FFFDF8"
        castShadow={isHighQuality}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={450}
        shadow-camera-left={-240}
        shadow-camera-right={240}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0003}
      />

      {/* 3. Crisp Metallic Edge Rim Light from North-East */}
      <directionalLight
        position={[120, 110, -110]}
        intensity={0.65}
        color="#E2E8F0"
      />

      {/* 4. Warm Ground Fill */}
      <directionalLight
        position={[60, 60, 100]}
        intensity={0.3}
        color="#F0EDE4"
      />

      {/* 5. Subtle Hemisphere Separation */}
      <hemisphereLight
        args={["#FFFFFF", "#1E1E24", 0.42]}
        position={[0, 60, 0]}
      />
    </group>
  );
};
