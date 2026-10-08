"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LayoutLockPlate } from "../../layout/types.ts";

interface JunctionLock3DProps {
  lockPlate: LayoutLockPlate;
  scale?: number;
}

/**
 * 3D Physical Dependency Interlock Mechanism
 * Machined steel housing with milled guide slots, individual sliding brass prerequisite pins,
 * and a physical master interlocking slide bar that prevents passage until all dependencies clear.
 */
export const JunctionLock3D: React.FC<JunctionLock3DProps> = ({
  lockPlate,
  scale = 0.12,
}) => {
  const { x, y, width, height, allSatisfied, pins } = lockPlate;

  const plateWidth = width * scale;
  const plateDepth = height * scale;

  const barRef = useRef<THREE.Mesh>(null);
  const targetBarZ = allSatisfied ? -plateDepth / 3 : 0;
  const targetBarY = allSatisfied ? 0.28 : 0.52;
  const currentBarZ = useRef(targetBarZ);
  const currentBarY = useRef(targetBarY);

  useFrame((_, delta) => {
    if (barRef.current) {
      currentBarZ.current += (targetBarZ - currentBarZ.current) * (delta * 9.0);
      currentBarY.current += (targetBarY - currentBarY.current) * (delta * 9.0);
      barRef.current.position.z = currentBarZ.current;
      barRef.current.position.y = currentBarY.current;
    }
  });

  return (
    <group position={[x * scale + plateWidth / 2, 0.25, y * scale + plateDepth / 2]}>
      {/* 1. Heavy Machined Steel Chassis Housing (#232328) */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[plateWidth, 0.45, plateDepth]} />
        <meshStandardMaterial
          color="#232328"
          roughness={0.35}
          metalness={0.75}
        />
      </mesh>

      {/* Guide Slot Channel Milled along the Interlock */}
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[plateWidth * 0.45, 0.08, plateDepth * 0.92]} />
        <meshStandardMaterial color="#121214" roughness={0.9} />
      </mesh>

      {/* 2. Individual Prerequisite Sliding Brass Pins */}
      {pins.map((pin, i) => {
        const pinZ = (pin.pinY - y - height / 2) * scale;
        const isSatisfied = pin.isSatisfied;

        return (
          <group key={`pin-${i}`} position={[0, isSatisfied ? 0.2 : 0.55, pinZ]}>
            {/* Sliding Solid Brass Pin */}
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.45, 8]} />
              <meshStandardMaterial
                color="#C5A059"
                roughness={0.25}
                metalness={0.9}
              />
            </mesh>
            {/* Active Amber Indicator Ring on Unsatisfied Pin */}
            {!isSatisfied && (
              <mesh position={[0, 0.24, 0]}>
                <sphereGeometry args={[0.14, 8, 8]} />
                <meshBasicMaterial color="#C98A2B" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 3. Physical Master Interlocking Slide Bar */}
      <mesh
        ref={barRef}
        position={[0, targetBarY, targetBarZ]}
        castShadow
      >
        <boxGeometry args={[plateWidth * 0.38, 0.32, allSatisfied ? plateDepth * 0.3 : plateDepth * 0.88]} />
        <meshStandardMaterial
          color={allSatisfied ? "#7A787F" : "#A63A32"}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};

