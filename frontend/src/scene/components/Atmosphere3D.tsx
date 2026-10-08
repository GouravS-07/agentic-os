"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export function Atmosphere3D() {
  // Deep space fog configuration
  const fogColor = useMemo(() => new THREE.Color("#030712"), []);

  return (
    <>
      {/* Volumetric Depth Fog */}
      <fogExp2 attach="fog" args={[fogColor, 0.018]} />

      {/* Deep Ambient Fill */}
      <ambientLight intensity={0.35} color="#1e293b" />

      {/* Primary Key Light (Cyan) */}
      <directionalLight
        position={[8, 12, 10]}
        intensity={2.2}
        color="#38bdf8"
      />

      {/* Sharp Rim Backlight (Indigo/Violet) */}
      <directionalLight
        position={[-10, 8, -12]}
        intensity={3.0}
        color="#818cf8"
      />

      {/* Under-glow Fill Light */}
      <pointLight
        position={[0, -6, 2]}
        intensity={1.2}
        distance={18}
        color="#0ea5e9"
      />

      {/* Coordinate Floor Ground Plane with Subtle Specular Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color="#020617"
          roughness={0.6}
          metalness={0.8}
        />
      </mesh>

      {/* Floor Coordinate Grid */}
      <gridHelper
        args={[80, 80, "#1e293b", "#0f172a"]}
        position={[0, -4.48, 0]}
      />
    </>
  );
}
