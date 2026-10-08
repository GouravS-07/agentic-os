"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SpatialConnection } from "../types";

interface SpatialConnection3DProps {
  connection: SpatialConnection;
}

export const SpatialConnection3D: React.FC<SpatialConnection3DProps> = ({
  connection,
}) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const { sourcePos, targetPos, status, isRecovery } = connection;

  // Compute curved path between source and target
  const { curve, points } = useMemo(() => {
    const v0 = new THREE.Vector3(...sourcePos);
    const v2 = new THREE.Vector3(...targetPos);
    
    // Midpoint elevated slightly on Y and slightly offset on Z to create graceful 3D arc
    const mid = new THREE.Vector3().addVectors(v0, v2).multiplyScalar(0.5);
    const dist = v0.distanceTo(v2);
    mid.y += Math.min(dist * 0.2, 1.5);
    mid.z += Math.sin(dist * 0.5) * 0.3;

    const bezier = new THREE.QuadraticBezierCurve3(v0, mid, v2);
    const pts = bezier.getPoints(32);

    return { curve: bezier, points: pts };
  }, [sourcePos, targetPos]);

  // Determine line color and opacity based on status
  const { color, opacity } = useMemo(() => {
    if (isRecovery) {
      return { color: "#f59e0b", opacity: 0.85 }; // Amber/Recovery
    }
    switch (status) {
      case "RUNNING":
        return { color: "#06b6d4", opacity: 0.9 }; // Cyan/Active
      case "COMPLETED":
        return { color: "#10b981", opacity: 0.6 }; // Emerald/Done
      case "FAILED":
        return { color: "#ef4444", opacity: 0.8 }; // Rose/Failed
      case "WAITING_APPROVAL":
        return { color: "#eab308", opacity: 0.7 }; // Yellow/Approval
      default:
        return { color: "#475569", opacity: 0.35 }; // Muted Slate
    }
  }, [status, isRecovery]);

  const lineMesh = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: opacity,
    });
    return new THREE.Line(geometry, material);
  }, [points, color, opacity]);

  // Animate pulse particle along running or recovery connections
  useFrame(({ clock }) => {
    if (pulseRef.current && (status === "RUNNING" || isRecovery)) {
      const speed = isRecovery ? 0.8 : 1.2;
      const t = (clock.getElapsedTime() * speed) % 1;
      const pt = curve.getPoint(t);
      pulseRef.current.position.copy(pt);
    }
  });

  return (
    <group>
      {/* Curved line connection */}
      <primitive object={lineMesh} />

      {/* Travelling energy packet on active connections */}
      {(status === "RUNNING" || isRecovery) && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial
            color={isRecovery ? "#fbbf24" : "#38bdf8"}
            transparent
            opacity={0.95}
          />
        </mesh>
      )}
    </group>
  );
};
