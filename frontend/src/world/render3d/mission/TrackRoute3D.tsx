"use client";

import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LayoutTrack } from "../../layout/types.ts";
import { applyChamferToOrthogonalPath } from "../../layout/chamfer.ts";

interface TrackRoute3DProps {
  track: LayoutTrack;
  scale?: number;
}

/**
 * 3D Precision Data Conduit (Interlocking Route)
 * Recessed dark conduit channel, ceramic standoffs, paired conductive bus rails,
 * machined brass 45° corner elbow brackets, dynamic data pulse waves, and physical breaker stops.
 */
export const TrackRoute3D: React.FC<TrackRoute3DProps> = ({
  track,
  scale = 0.12,
}) => {
  const { points, status, isRecovery, hasGapOnFailure } = track;
  const { invalidate } = useThree();
  const pulseRef = useRef<THREE.Group>(null);

  // Convert points to chamfered 3D line points
  const linePoints = useMemo(() => {
    const chamfered2D = applyChamferToOrthogonalPath(points, 8.0);
    return chamfered2D.map((p) => new THREE.Vector3(p.x * scale, 0.05, p.y * scale));
  }, [points, scale]);

  const isGhosted = status === "FAILED" && isRecovery;

  const conductiveRailColor =
    status === "FAILED"
      ? "#A63A32"
      : status === "RUNNING"
      ? "#C98A2B"
      : status === "COMPLETED"
      ? "#A8A69E"
      : isRecovery
      ? "#C98A2B"
      : "#5A5A65";

  // Midpoint for failure stop bar
  const midPoint = linePoints[Math.floor(linePoints.length / 2)] || linePoints[0];

  // Render physical dual conductive rails, recessed tray, standoffs, and clips for each segment
  const { railSegments, standoffs, junctionCorners, totalLength } = useMemo(() => {
    const segments: Array<{
      midX: number;
      midZ: number;
      len: number;
      angle: number;
      nx: number;
      nz: number;
      startX: number;
      startZ: number;
      endX: number;
      endZ: number;
    }> = [];

    const offs: Array<{
      x: number;
      z: number;
      angle: number;
    }> = [];

    const corners: Array<{
      x: number;
      z: number;
    }> = [];

    let total = 0;

    for (let i = 0; i < linePoints.length - 1; i++) {
      const p1 = linePoints[i];
      const p2 = linePoints[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;

      total += len;
      const angle = Math.atan2(dx, dz);
      const nx = -dz / len;
      const nz = dx / len;

      segments.push({
        midX: (p1.x + p2.x) / 2,
        midZ: (p1.z + p2.z) / 2,
        len,
        angle,
        nx,
        nz,
        startX: p1.x,
        startZ: p1.z,
        endX: p2.x,
        endZ: p2.z,
      });

      // Generate ceramic insulator standoffs along segment (every ~3.5 units)
      const numStandoffs = Math.max(1, Math.floor(len / 3.5));
      for (let t = 1; t <= numStandoffs; t++) {
        const frac = t / (numStandoffs + 1);
        offs.push({
          x: p1.x + dx * frac,
          z: p1.z + dz * frac,
          angle,
        });
      }

      // Record corner vertex for machined brass junction bracket
      if (i < linePoints.length - 2) {
        corners.push({ x: p2.x, z: p2.z });
      }
    }

    return { railSegments: segments, standoffs: offs, junctionCorners: corners, totalLength: total };
  }, [linePoints]);

  useFrame((state) => {
    if (status === "RUNNING" && pulseRef.current && totalLength > 0 && railSegments.length > 0) {
      const t = (state.clock.getElapsedTime() * 1.5) % 1;
      let targetDist = t * totalLength;
      let currentDist = 0;

      for (const seg of railSegments) {
        if (targetDist <= currentDist + seg.len) {
          const frac = (targetDist - currentDist) / seg.len;
          pulseRef.current.position.x = seg.startX + (seg.endX - seg.startX) * frac;
          pulseRef.current.position.z = seg.startZ + (seg.endZ - seg.startZ) * frac;
          pulseRef.current.position.y = 0.22;
          break;
        }
        currentDist += seg.len;
      }
      invalidate();
    }
  });

  return (
    <group name={`conduit-${track.id}`}>
      {/* 1. Recessed Conduit Channel Bed along Route */}
      {railSegments.map((seg, idx) => (
        <group key={`bed-${idx}`} position={[seg.midX, 0.04, seg.midZ]} rotation={[0, seg.angle, 0]}>
          {/* Recessed Trench Trough (#111113) */}
          <mesh receiveShadow>
            <boxGeometry args={[2.2, 0.08, seg.len]} />
            <meshStandardMaterial
              color="#111113"
              roughness={0.95}
              transparent={isGhosted}
              opacity={isGhosted ? 0.35 : 1.0}
            />
          </mesh>
          {/* Machined Metal Channel Edge Trim */}
          <mesh position={[-1.15, 0.04, 0]}>
            <boxGeometry args={[0.1, 0.06, seg.len]} />
            <meshStandardMaterial color="#3A3A42" metalness={0.7} />
          </mesh>
          <mesh position={[1.15, 0.04, 0]}>
            <boxGeometry args={[0.1, 0.06, seg.len]} />
            <meshStandardMaterial color="#3A3A42" metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* 2. Ceramic Insulator Standoffs */}
      {standoffs.map((st, idx) => (
        <mesh
          key={`standoff-${idx}`}
          position={[st.x, 0.1, st.z]}
          rotation={[0, st.angle, 0]}
          castShadow
        >
          <boxGeometry args={[1.8, 0.08, 0.35]} />
          <meshStandardMaterial color="#E8E2D2" roughness={0.8} />
        </mesh>
      ))}

      {/* 3. Paired Solid Metallic Conductive Rails */}
      {railSegments.map((seg, idx) => {
        const offset = 0.42;
        return (
          <React.Fragment key={`rails-${idx}`}>
            {/* North Conductor Rail */}
            <mesh
              position={[seg.midX + seg.nx * offset, 0.14, seg.midZ + seg.nz * offset]}
              rotation={[0, seg.angle, 0]}
              castShadow
            >
              <boxGeometry args={[0.22, 0.08, seg.len]} />
              <meshStandardMaterial
                color={conductiveRailColor}
                metalness={0.8}
                roughness={0.25}
                transparent={isGhosted}
                opacity={isGhosted ? 0.3 : 1.0}
              />
            </mesh>

            {/* South Conductor Rail */}
            <mesh
              position={[seg.midX - seg.nx * offset, 0.14, seg.midZ - seg.nz * offset]}
              rotation={[0, seg.angle, 0]}
              castShadow
            >
              <boxGeometry args={[0.22, 0.08, seg.len]} />
              <meshStandardMaterial
                color={conductiveRailColor}
                metalness={0.8}
                roughness={0.25}
                transparent={isGhosted}
                opacity={isGhosted ? 0.3 : 1.0}
              />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* 4. Active Data Pulse Wave on Running Track */}
      {status === "RUNNING" && (
        <group ref={pulseRef}>
          <mesh castShadow>
            <sphereGeometry args={[0.28, 8, 8]} />
            <meshBasicMaterial color="#C98A2B" />
          </mesh>
        </group>
      )}

      {/* 5. Machined Brass 45° Corner Elbow Brackets with Mounting Screws */}
      {junctionCorners.map((cor, idx) => (
        <group key={`corner-${idx}`} position={[cor.x, 0.16, cor.z]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.08, 0.85]} />
            <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Corner Screw */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 6]} />
            <meshBasicMaterial color="#161619" />
          </mesh>
        </group>
      ))}

      {/* 6. Physical Failure Mechanical Stop Barrier on Interrupted Conduit */}
      {hasGapOnFailure && midPoint && (
        <group position={[midPoint.x, 0.35, midPoint.z]}>
          {/* Red Physical Barrier Gate */}
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.7, 2.4]} />
            <meshStandardMaterial color="#A63A32" roughness={0.4} metalness={0.4} />
          </mesh>
          {/* Locking Pin Stanchion */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.2, 12]} />
            <meshStandardMaterial color="#161619" metalness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
};

