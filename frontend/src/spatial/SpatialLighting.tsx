/**
 * AGENTIC OS — Spatial Lighting
 * Restrained dark studio lighting for the spatial mission workspace.
 * Visual principle: reveal geometry through light, not neon glow.
 * NO colored accent lights, NO cyan/purple fill lights.
 */

import React from "react";

export function SpatialLighting() {
  return (
    <>
      {/* Ambient: very low — barely enough to read shadow geometry */}
      <ambientLight intensity={0.12} color="#d8d4cc" />

      {/* Key light: warm-neutral directional from upper-left */}
      <directionalLight
        position={[-6, 10, 6]}
        intensity={1.1}
        color="#f0ece4"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.001}
      />

      {/* Rim light: cooler, subtle, from lower-right rear — reveals depth on modules */}
      <directionalLight
        position={[8, -2, -10]}
        intensity={0.18}
        color="#c8d4e0"
        castShadow={false}
      />

      {/* Ground bounce: very faint warm from below — prevents total black undersides */}
      <hemisphereLight
        args={["#1a1814", "#0a0a08", 0.08]}
      />
    </>
  );
}
