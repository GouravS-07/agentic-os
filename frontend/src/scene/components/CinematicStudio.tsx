"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export function CinematicStudio() {
  const fogColor = useMemo(() => new THREE.Color("#030407"), []);

  return (
    <>
      {/* Deep Atmospheric Void (No Floor Grid) */}
      <fogExp2 attach="fog" args={[fogColor, 0.02]} />

      {/* Ambient Foundation */}
      <ambientLight intensity={0.5} color="#1e293b" />

      {/* Primary Key Light (Top-Right High Specular) */}
      <directionalLight
        position={[12, 16, 10]}
        intensity={3.6}
        color="#ffffff"
      />

      {/* Rim Grazing Backlight (Deep Indigo Silhouette) */}
      <directionalLight
        position={[-14, -8, -12]}
        intensity={2.4}
        color="#818cf8"
      />

      {/* Front Specular Highlight Fill */}
      <pointLight
        position={[0, 4, 8]}
        intensity={1.8}
        distance={25}
        color="#e0f2fe"
      />
    </>
  );
}
