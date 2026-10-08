"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Atmosphere() {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate restrained spatial dust particles
  const particleCount = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 45;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 35;
    }
    return pos;
  }, [particleCount]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.015;
      pointsRef.current.rotation.x += delta * 0.008;
    }
  });

  return (
    <>
      {/* 1. Deep Space Atmospheric Fog */}
      <color attach="background" args={["#090A0F"]} />
      <fog attach="fog" args={["#090A0F", 15, 45]} />

      {/* 2. Sophisticated Studio Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} color="#818CF8" />
      <pointLight position={[-12, -8, -5]} intensity={0.8} color="#06B6D4" distance={30} />
      <pointLight position={[12, 10, -5]} intensity={0.9} color="#A855F7" distance={30} />

      {/* 3. Floating Ambient Dust Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#94A3B8"
          transparent
          opacity={0.35}
          sizeAttenuation
        />
      </points>

      {/* 4. Fine Spatial Floor Grid */}
      <gridHelper
        args={[60, 40, "#1E2235", "#12141C"]}
        position={[0, -4.5, 0]}
      />
    </>
  );
}
