"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export function StudioLighting() {
  const fogColor = useMemo(() => new THREE.Color("#030306"), []);

  return (
    <>
      {/* Deep Atmospheric Infinite Void */}
      <fogExp2 attach="fog" args={[fogColor, 0.025]} />

      {/* Ambient Fill */}
      <ambientLight intensity={0.65} color="#1e293b" />

      {/* High-Key Cold White Key Light (Highlights Bevels) */}
      <directionalLight
        position={[10, 15, 12]}
        intensity={4.5}
        color="#ffffff"
      />

      {/* Opposite Fill Light (Paler Slate) */}
      <directionalLight
        position={[-12, 8, 8]}
        intensity={2.8}
        color="#94a3b8"
      />

      {/* Razor-Sharp Indigo Rim Silhouette Light */}
      <directionalLight
        position={[0, -10, -12]}
        intensity={3.5}
        color="#6366f1"
      />

      {/* Cyan Specular Glint */}
      <pointLight
        position={[4, 6, 6]}
        intensity={2.0}
        distance={20}
        color="#38bdf8"
      />
    </>
  );
}
