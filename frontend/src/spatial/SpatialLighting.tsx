/**
 * AGENTIC OS — Spatial Lighting (Refined Phase B)
 * Restrained, high-contrast computational studio environment.
 *
 * Visual principle:
 * - Controlled graphite base (#0b0c10 floor, #0e1016 background).
 * - Soft neutral ambient fill (#dedad2) ensuring typography and chamfers are crisp.
 * - Strong, focused key directional light creating contact shadows.
 * - Cool rim edge light highlighting module silhouettes and physical conduits.
 * - NO cyan/purple/neon glow. NO bloom gimmick.
 */

import React from "react";

export function SpatialLighting() {
  return (
    <>
      {/* Ambient fill: high-clarity neutral — prevents murky shadows */}
      <ambientLight intensity={0.65} color="#e4e8f2" />

      {/* Primary Key Light: crisp studio architectural directional */}
      <directionalLight
        position={[-10, 18, 14]}
        intensity={2.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />

      {/* Secondary Edge/Rim Light: crisp titanium highlight from rear-right */}
      <directionalLight
        position={[16, 9, -14]}
        intensity={1.25}
        color="#d8e4f8"
        castShadow={false}
      />

      {/* Low-Angle Grazing Light: highlights side port collars and louvers */}
      <directionalLight
        position={[-14, 2, 8]}
        intensity={0.65}
        color="#c8d4e8"
        castShadow={false}
      />

      {/* Ground bounce fill: prevents pitch black undersides */}
      <hemisphereLight
        args={["#2c3244", "#10131c", 0.45]}
      />
    </>
  );
}
