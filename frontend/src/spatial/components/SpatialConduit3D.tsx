/**
 * AGENTIC OS — SpatialConduit3D (Engineered Pipeline Redesign)
 *
 * Principle: Conduits are structural computational bus ducts with physical
 * port couplings, floor mounting stanchions, and directional junction boxes.
 *
 * Not a thin line between two boxes:
 * [MODULE OUTPUT PORT] ──► [FLANGED COUPLING] ──► [BUS DUCT] ──► [JUNCTION BOX] ──► [RECEIVER FLANGE] ──► [MODULE INPUT PORT]
 */

"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneRoute, SceneRouteVisualState } from "@/world/adapter/types";

// Conduit Dimensions (metres)
export const DUCT_WIDTH = 0.24;
export const DUCT_HEIGHT = 0.13;
export const FLANGE_RADIUS = 0.21;
export const FLANGE_LENGTH = 0.18;
export const STANCHION_SIZE = 0.07;

// Engineering Palette (High-contrast against dark computational plinth)
const CONDUIT_PALETTE: Record<
  SceneRouteVisualState,
  {
    casing: string;
    busBar: string;
    flange: string;
    clamp: string;
    wedge: string;
    stanchion: string;
  }
> = {
  PENDING_DASHED: {
    casing: "#222634",
    busBar: "#141722",
    flange: "#2c3348",
    clamp: "#3a425c",
    wedge: "#485270",
    stanchion: "#181b26",
  },
  SET_SOLID: {
    casing: "#263428",
    busBar: "#16221a",
    flange: "#344838",
    clamp: "#46624c",
    wedge: "#5a8262",
    stanchion: "#1a241c",
  },
  ENERGIZED_AMBER: {
    casing: "#363c28",
    busBar: "#1e2414",
    flange: "#485234",
    clamp: "#647442",
    wedge: "#889e54",
    stanchion: "#222618",
  },
  FRACTURED_RED: {
    casing: "#362224",
    busBar: "#201214",
    flange: "#4a2a2e",
    clamp: "#68363c",
    wedge: "#8c444a",
    stanchion: "#241618",
  },
  GHOST_REVISED: {
    casing: "#202028",
    busBar: "#121218",
    flange: "#2a2a36",
    clamp: "#383848",
    wedge: "#48485c",
    stanchion: "#16161e",
  },
  RECOVERY_DASHED: {
    casing: "#302838",
    busBar: "#1c1424",
    flange: "#443450",
    clamp: "#604874",
    wedge: "#7e5c9a",
    stanchion: "#201a26",
  },
};

// ── Physical Port Coupling Collar Flange ──
function PortCouplingFlange({
  position,
  palette,
  isSource,
}: {
  position: [number, number, number];
  palette: (typeof CONDUIT_PALETTE)["PENDING_DASHED"];
  isSource: boolean;
}) {
  return (
    <group position={position}>
      {/* Outer Flanged Collar Sleeve (pointing along X) */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[FLANGE_RADIUS, FLANGE_RADIUS, FLANGE_LENGTH, 16]} />
        <meshStandardMaterial color={palette.flange} roughness={0.65} metalness={0.45} />
      </mesh>
      {/* Heavy Bolted Mounting Ring */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[FLANGE_RADIUS + 0.035, FLANGE_RADIUS + 0.035, 0.05, 16]} />
        <meshStandardMaterial color={palette.clamp} roughness={0.5} metalness={0.55} />
      </mesh>
      {/* Structural Support Bracket */}
      <mesh position={[0, -0.10, 0]}>
        <boxGeometry args={[0.08, 0.12, DUCT_WIDTH + 0.04]} />
        <meshStandardMaterial color={palette.clamp} roughness={0.7} metalness={0.4} />
      </mesh>
    </group>
  );
}

// ── Ground Support Stanchion (anchoring elevated conduit to floor) ──
function GroundStanchion({
  x,
  z,
  elevation,
  palette,
}: {
  x: number;
  z: number;
  elevation: number;
  palette: (typeof CONDUIT_PALETTE)["PENDING_DASHED"];
}) {
  return (
    <group position={[x, elevation / 2, z]}>
      {/* Stanchion Leg Post */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[STANCHION_SIZE, elevation, STANCHION_SIZE]} />
        <meshStandardMaterial color={palette.stanchion} roughness={0.88} metalness={0.25} />
      </mesh>
      {/* Floor Footing Flange */}
      <mesh position={[0, -elevation / 2 + 0.015, 0]}>
        <boxGeometry args={[STANCHION_SIZE + 0.08, 0.03, STANCHION_SIZE + 0.08]} />
        <meshStandardMaterial color={palette.clamp} roughness={0.75} metalness={0.4} />
      </mesh>
      {/* Top Duct Saddle Clamp */}
      <mesh position={[0, elevation / 2 - 0.015, 0]}>
        <boxGeometry args={[STANCHION_SIZE + 0.06, 0.03, DUCT_WIDTH + 0.04]} />
        <meshStandardMaterial color={palette.clamp} roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ── Directional Junction Cube (at 90-degree turns) ──
function CornerJunctionBlock({
  x,
  y,
  z,
  palette,
}: {
  x: number;
  y: number;
  z: number;
  palette: (typeof CONDUIT_PALETTE)["PENDING_DASHED"];
}) {
  return (
    <group position={[x, y, z]}>
      {/* Solid Junction Cube */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[DUCT_WIDTH + 0.08, DUCT_HEIGHT + 0.04, DUCT_WIDTH + 0.08]} />
        <meshStandardMaterial color={palette.flange} roughness={0.68} metalness={0.4} />
      </mesh>
      {/* Top Beveled Inspection Cap */}
      <mesh position={[0, DUCT_HEIGHT / 2 + 0.025, 0]}>
        <boxGeometry args={[DUCT_WIDTH - 0.02, 0.02, DUCT_WIDTH - 0.02]} />
        <meshStandardMaterial color={palette.clamp} roughness={0.5} metalness={0.55} />
      </mesh>
    </group>
  );
}

// ── Directional Parametric Energy Packets (Active RUNNING bus conduits) ──
function DirectionalEnergyPackets({
  startX,
  startY,
  startZ,
  endX,
  endY,
  endZ,
  segments,
}: {
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  segments: {
    isDirect: boolean;
    seg1: { x: number; z: number; len: number; isX: boolean };
    seg2: { x: number; z: number; len: number; isX: boolean } | null;
    seg3: { x: number; z: number; len: number; isX: boolean } | null;
  };
}) {
  const p1Ref = useRef<THREE.Group>(null);
  const p2Ref = useRef<THREE.Group>(null);
  const p3Ref = useRef<THREE.Group>(null);

  const isDirect = segments.isDirect;
  const L1 = segments.seg1?.len || 0;
  const L2 = segments.seg2?.len || 0;
  const L3 = segments.seg3?.len || 0;
  const totalLength = isDirect ? L1 : L1 + L2 + L3;
  const midX = (startX + endX) / 2;

  useFrame((state) => {
    if (totalLength <= 0.05) return;
    const t = state.clock.elapsedTime * 2.2; // 2.2 m/s

    const updatePacket = (ref: React.RefObject<THREE.Group>, phase: number) => {
      if (!ref.current) return;
      const progress = ((t / totalLength + phase) % 1 + 1) % 1;
      const d = progress * totalLength;
      const yPos = startY + DUCT_HEIGHT * 0.35 + 0.008;

      if (isDirect) {
        ref.current.position.set(startX + d, yPos, startZ);
        ref.current.rotation.set(0, 0, 0);
      } else {
        if (d < L1) {
          ref.current.position.set(startX + d, yPos, startZ);
          ref.current.rotation.set(0, 0, 0);
        } else if (d < L1 + L2) {
          const zOffset = d - L1;
          const signZ = Math.sign(endZ - startZ);
          ref.current.position.set(midX, yPos, startZ + signZ * zOffset);
          ref.current.rotation.set(0, Math.PI / 2, 0);
        } else {
          const xOffset = d - L1 - L2;
          ref.current.position.set(midX + xOffset, yPos, endZ);
          ref.current.rotation.set(0, 0, 0);
        }
      }
    };

    updatePacket(p1Ref, 0.0);
    updatePacket(p2Ref, 0.333);
    updatePacket(p3Ref, 0.666);
  });

  return (
    <group>
      {[p1Ref, p2Ref, p3Ref].map((ref, idx) => (
        <group key={idx} ref={ref}>
          {/* Main Energy Packet Core */}
          <mesh>
            <boxGeometry args={[0.22, 0.035, 0.075]} />
            <meshStandardMaterial
              color="#e6b44a"
              emissive="#b88028"
              emissiveIntensity={0.8}
              roughness={0.25}
              metalness={0.3}
            />
          </mesh>
          {/* Subtle Packet Head Glow Pip */}
          <mesh position={[0.11, 0, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.065]} />
            <meshStandardMaterial
              color="#fff0aa"
              emissive="#ffd055"
              emissiveIntensity={1.2}
              roughness={0.1}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export interface SpatialConduit3DProps {
  route: SceneRoute;
  start: [number, number, number];
  end: [number, number, number];
  isSelectedRoute?: boolean;
  isDownstreamRoute?: boolean;
  isDimmed?: boolean;
  isTransmitting?: boolean;
  prefersReducedMotion?: boolean;
}

export function SpatialConduit3D({
  route,
  start,
  end,
  isSelectedRoute = false,
  isDownstreamRoute = false,
  isDimmed = false,
  isTransmitting = false,
  prefersReducedMotion = false,
}: SpatialConduit3DProps) {
  const basePalette = CONDUIT_PALETTE[route.state] || CONDUIT_PALETTE.PENDING_DASHED;

  const palette = useMemo(() => {
    if (isSelectedRoute) {
      // Solid authoritative emphasized mechanical contrast (NO neon, NO glowing laser effect)
      return {
        casing: "#3e485e",
        busBar: "#242a3a",
        flange: "#526280",
        clamp: "#7084a8",
        wedge: "#96aecd",
        stanchion: "#252b38",
      };
    }
    if (isDownstreamRoute) {
      // Slightly more visible downstream route
      return {
        casing: "#303746",
        busBar: "#1a1f2c",
        flange: "#404b60",
        clamp: "#586782",
        wedge: "#788aa8",
        stanchion: "#1c212c",
      };
    }
    if (isDimmed) {
      // Dimmed background route
      return {
        casing: "#161922",
        busBar: "#0e1017",
        flange: "#1e222e",
        clamp: "#282e3e",
        wedge: "#323a4e",
        stanchion: "#12141c",
      };
    }
    return basePalette;
  }, [isSelectedRoute, isDownstreamRoute, isDimmed, basePalette]);

  const isFractured = route.state === "FRACTURED_RED";

  const [startX, startY, startZ] = start;
  const [endX, endY, endZ] = end;

  // Compute Orthogonal Segment Geometry
  // Path: (startX, startY, startZ) -> (midX, startY, startZ) -> (midX, startY, endZ) -> (endX, endY, endZ)
  const segments = useMemo(() => {
    const isDirect = Math.abs(startZ - endZ) < 0.08;
    const midX = (startX + endX) / 2;

    if (isDirect) {
      const length = Math.max(0.1, endX - startX);
      return {
        isDirect: true,
        seg1: { x: (startX + endX) / 2, z: startZ, len: length, isX: true },
        corner1: null,
        seg2: null,
        corner2: null,
        seg3: null,
      };
    }

    const seg1Len = Math.max(0.1, midX - startX);
    const seg2Len = Math.max(0.1, Math.abs(endZ - startZ));
    const seg3Len = Math.max(0.1, endX - midX);

    return {
      isDirect: false,
      seg1: { x: (startX + midX) / 2, z: startZ, len: seg1Len, isX: true },
      corner1: { x: midX, z: startZ },
      seg2: { x: midX, z: (startZ + endZ) / 2, len: seg2Len, isX: false },
      corner2: { x: midX, z: endZ },
      seg3: { x: (midX + endX) / 2, z: endZ, len: seg3Len, isX: true },
    };
  }, [startX, startZ, endX, endZ]);

  return (
    <group>
      {/* ── 1. SOURCE PORT COUPLING FLANGE ── */}
      <PortCouplingFlange position={[startX + FLANGE_LENGTH / 2, startY, startZ]} palette={palette} isSource={true} />

      {/* ── 2. TARGET PORT COUPLING FLANGE ── */}
      <PortCouplingFlange position={[endX - FLANGE_LENGTH / 2, endY, endZ]} palette={palette} isSource={false} />

      {/* ── 3. DIRECT OR SEGMENTED BUS DUCT RUNS ── */}
      {segments.isDirect ? (
        <group>
          {/* Main X Bus Duct Run */}
          <group position={[segments.seg1.x, startY, segments.seg1.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[segments.seg1.len, DUCT_HEIGHT, DUCT_WIDTH]} />
              <meshStandardMaterial color={palette.casing} roughness={0.78} metalness={0.3} />
            </mesh>
            {/* Inner Recessed Core Channel */}
            <mesh position={[0, DUCT_HEIGHT * 0.35, 0]}>
              <boxGeometry args={[Math.max(0.04, segments.seg1.len - 0.08), DUCT_HEIGHT * 0.45, DUCT_WIDTH * 0.55]} />
              <meshStandardMaterial color={palette.busBar} roughness={0.92} metalness={0.15} />
            </mesh>
          </group>

          {/* Floor Stanchions */}
          <GroundStanchion x={segments.seg1.x} z={segments.seg1.z} elevation={startY} palette={palette} />
        </group>
      ) : (
        <group>
          {/* Segment 1: from start to midX */}
          {segments.seg1 && (
            <group position={[segments.seg1.x, startY, segments.seg1.z]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[segments.seg1.len, DUCT_HEIGHT, DUCT_WIDTH]} />
                <meshStandardMaterial color={palette.casing} roughness={0.78} metalness={0.3} />
              </mesh>
            </group>
          )}

          {/* Corner Junction 1 */}
          {segments.corner1 && (
            <CornerJunctionBlock
              x={segments.corner1.x}
              y={startY}
              z={segments.corner1.z}
              palette={palette}
            />
          )}

          {/* Segment 2: Z-axis lateral cross-feed */}
          {segments.seg2 && (
            <group position={[segments.seg2.x, startY, segments.seg2.z]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[DUCT_WIDTH, DUCT_HEIGHT, segments.seg2.len]} />
                <meshStandardMaterial color={palette.casing} roughness={0.78} metalness={0.3} />
              </mesh>
            </group>
          )}

          {/* Corner Junction 2 */}
          {segments.corner2 && (
            <CornerJunctionBlock
              x={segments.corner2.x}
              y={startY}
              z={segments.corner2.z}
              palette={palette}
            />
          )}

          {/* Segment 3: from midX to target */}
          {segments.seg3 && (
            <group position={[segments.seg3.x, startY, segments.seg3.z]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[segments.seg3.len, DUCT_HEIGHT, DUCT_WIDTH]} />
                <meshStandardMaterial color={palette.casing} roughness={0.78} metalness={0.3} />
              </mesh>
            </group>
          )}

          {/* Midpoint Ground Stanchion */}
          {segments.corner1 && (
            <GroundStanchion x={segments.corner1.x} z={segments.corner1.z} elevation={startY} palette={palette} />
          )}
        </group>
      )}

      {/* ── 4. FRACTURE SEVERANCE GAP (on FAILED routes) ── */}
      {isFractured && (
        <group position={[startX + 0.8, startY, startZ]}>
          <mesh>
            <boxGeometry args={[0.22, DUCT_HEIGHT + 0.04, DUCT_WIDTH + 0.04]} />
            <meshStandardMaterial color="#080608" roughness={0.98} metalness={0.05} />
          </mesh>
        </group>
      )}

      {/* ── 5. DIRECTIONAL ENERGY PACKETS (Active RUNNING routes) ── */}
      {isTransmitting && !prefersReducedMotion && (
        <DirectionalEnergyPackets
          startX={startX}
          startY={startY}
          startZ={startZ}
          endX={endX}
          endY={endY}
          endZ={endZ}
          segments={segments}
        />
      )}
    </group>
  );
}
