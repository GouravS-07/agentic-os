/**
 * AGENTIC OS — SpatialConduit3D
 * Physical dependency conduit connecting task modules in the spatial DAG.
 *
 * VISUAL LANGUAGE:
 * - Recessed channel geometry between task modules (NOT a laser/beam)
 * - Segmented structure — direction implied by stepped geometry, not arrows
 * - Grounded at same Y-level as module bases
 * - State-responsive: active conduits use slightly lighter channel colour
 * - No particle streams, no glow, no floating elements
 *
 * GEOMETRY:
 * - Horizontal run from output socket to input socket (X axis)
 * - Routed around intermediate tasks if needed (simple L-route or straight)
 * - Channel cross-section: shallow rectangular trough sitting on base plane
 * - Segment dividers: thin vertical slabs spaced along the conduit length
 * - Direction indicator: a single recessed wedge-notch near destination end
 */

"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

// Conduit cross-section dimensions
const CONDUIT_W = 0.10;  // width of the channel (X-perpendicular)
const CONDUIT_H = 0.05;  // height above base
const CONDUIT_Y = 0.065; // Y centre of conduit (sitting on base plane)

// Segment divider dimensions
const SEG_W  = 0.028;
const SEG_H  = 0.07;
const SEG_D  = CONDUIT_W + 0.01;

// ─── Colour palette ────────────────────────────────────────────────────────────
const CONDUIT_COLORS = {
  default:   "#1a1a22",
  active:    "#252c1e",   // slightly warm (running dependency)
  done:      "#1c221c",
  failed:    "#22181a",
  blocked:   "#161620",
  channel:   "#0e0e14",
  divider:   "#222230",
  dividerActive: "#2a3220",
  notch:     "#2a2a3a",
  notchActive: "#38482a",
};

type ConduitStatus = "default" | "active" | "done" | "failed" | "blocked";

function getConduitColor(status: ConduitStatus): string {
  return CONDUIT_COLORS[status] ?? CONDUIT_COLORS.default;
}

function getDividerColor(status: ConduitStatus): string {
  return status === "active" ? CONDUIT_COLORS.dividerActive : CONDUIT_COLORS.divider;
}

// ─── Individual Segment component ─────────────────────────────────────────────
interface SegmentProps {
  startX: number;
  endX: number;
  z: number;
  status: ConduitStatus;
}

function ConduitSegment({ startX, endX, z, status }: SegmentProps) {
  const length = Math.abs(endX - startX);
  const centerX = (startX + endX) / 2;
  const color = getConduitColor(status);
  const divColor = getDividerColor(status);

  // Number of dividers along segment (one every ~0.8 units)
  const numDividers = Math.max(0, Math.floor(length / 0.8) - 1);

  return (
    <group position={[centerX, CONDUIT_Y, z]}>
      {/* Channel trough */}
      <mesh>
        <boxGeometry args={[length, CONDUIT_H, CONDUIT_W]} />
        <meshStandardMaterial color={color} roughness={0.92} metalness={0.1} />
      </mesh>
      {/* Inner recessed channel */}
      <mesh position={[0, CONDUIT_H * 0.3, 0]}>
        <boxGeometry args={[length - 0.04, CONDUIT_H * 0.5, CONDUIT_W * 0.5]} />
        <meshStandardMaterial color={CONDUIT_COLORS.channel} roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Segment dividers */}
      {Array.from({ length: numDividers }, (_, i) => {
        const t = (i + 1) / (numDividers + 1);
        const localX = (t - 0.5) * length;
        return (
          <mesh key={i} position={[localX, SEG_H / 2 - CONDUIT_H / 2 + 0.005, 0]}>
            <boxGeometry args={[SEG_W, SEG_H, SEG_D]} />
            <meshStandardMaterial color={divColor} roughness={0.85} metalness={0.12} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Direction notch (near destination end) ────────────────────────────────────
function DirectionNotch({
  x,
  z,
  status,
  facingRight,
}: {
  x: number;
  z: number;
  status: ConduitStatus;
  facingRight: boolean;
}) {
  const color = status === "active" ? CONDUIT_COLORS.notchActive : CONDUIT_COLORS.notch;
  const sign = facingRight ? 1 : -1;

  return (
    <group position={[x, CONDUIT_Y + CONDUIT_H * 0.5, z]}>
      {/* Wedge pointing in direction of data flow */}
      <mesh rotation={[0, facingRight ? 0 : Math.PI, 0]}>
        <coneGeometry args={[0.06, 0.14, 3, 1]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.15} />
      </mesh>
    </group>
  );
}

// ─── Vertical connector leg (for L-shaped routing) ────────────────────────────
interface VerticalLegProps {
  x: number;
  startZ: number;
  endZ: number;
  status: ConduitStatus;
}

function VerticalLeg({ x, startZ, endZ, status }: VerticalLegProps) {
  const length = Math.abs(endZ - startZ);
  const centerZ = (startZ + endZ) / 2;
  const color = getConduitColor(status);

  return (
    <group position={[x, CONDUIT_Y, centerZ]}>
      <mesh>
        <boxGeometry args={[CONDUIT_W, CONDUIT_H, length]} />
        <meshStandardMaterial color={color} roughness={0.92} metalness={0.1} />
      </mesh>
      {/* Inner channel */}
      <mesh position={[0, CONDUIT_H * 0.3, 0]}>
        <boxGeometry args={[CONDUIT_W * 0.5, CONDUIT_H * 0.5, length - 0.04]} />
        <meshStandardMaterial color={CONDUIT_COLORS.channel} roughness={0.95} metalness={0.05} />
      </mesh>
    </group>
  );
}

// ─── Main SpatialConduit3D Component ──────────────────────────────────────────
export interface SpatialConduit3DProps {
  /**
   * World-space start point (output socket position of source module).
   * Typically [sourceX + W/2, 0, sourceZ]
   */
  start: [number, number, number];
  /**
   * World-space end point (input socket position of target module).
   * Typically [targetX - W/2, 0, targetZ]
   */
  end: [number, number, number];
  status: ConduitStatus;
}

export function SpatialConduit3D({ start, end, end: _end, status }: SpatialConduit3DProps) {
  const [sx, , sz] = start;
  const [ex, , ez] = end;

  const deltaX = ex - sx;
  const deltaZ = ez - sz;
  const straightThreshold = 0.2; // treat as same Z if within 0.2 units

  // Determine routing strategy
  const isStraight = Math.abs(deltaZ) < straightThreshold;

  if (isStraight) {
    // ── Straight horizontal conduit ───────────────────────────────────────
    const notchX = sx + (ex - sx) * 0.85;
    return (
      <group>
        <ConduitSegment
          startX={sx}
          endX={ex}
          z={sz}
          status={status}
        />
        <DirectionNotch
          x={notchX}
          z={sz}
          status={status}
          facingRight={ex > sx}
        />
      </group>
    );
  }

  // ── L-shaped route (different Z levels) ──────────────────────────────────
  // Route: horizontal from start → midpoint, then vertical → horizontal to end
  const midX = sx + deltaX * 0.5;

  return (
    <group>
      {/* First horizontal leg: source → midX */}
      <ConduitSegment startX={sx} endX={midX} z={sz} status={status} />
      {/* Vertical connector at midX */}
      <VerticalLeg x={midX} startZ={sz} endZ={ez} status={status} />
      {/* Second horizontal leg: midX → destination */}
      <ConduitSegment startX={midX} endX={ex} z={ez} status={status} />
      {/* Direction notch near destination */}
      <DirectionNotch
        x={ex - (ex - midX) * 0.18}
        z={ez}
        status={status}
        facingRight={ex > midX}
      />
    </group>
  );
}
