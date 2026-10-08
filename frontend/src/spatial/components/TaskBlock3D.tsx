/**
 * AGENTIC OS — TaskBlock3D
 * A compute module representing a single task in the spatial DAG.
 *
 * VISUAL LANGUAGE:
 * - Solid, grounded geometry with Z-depth layers
 * - Input socket(s) on left face, output socket(s) on right face
 * - Information surface on the top face (inset, not floating)
 * - State expressed through MATERIAL + SUBTLE GEOMETRY, not glow
 * - No ambient animation — idle scene is completely still
 * - Motion only on user interaction or real backend events
 *
 * STATES:
 * - PENDING  → muted/recessed dark surface
 * - READY    → slightly raised, neutral warm
 * - RUNNING  → active material, subtle raised body, warm edge
 * - DONE     → settled, lighter surface (confirmation)
 * - FAILED   → contained disruption geometry (cracked indent), dark red material
 * - BLOCKED  → compressed, muted
 * - APPROVAL_REQUIRED → gate indicator on output face
 *
 * GEOMETRY:
 * - Base plate (full XZ footprint, thin, darker)
 * - Body (main module volume, state-dependent height)
 * - Top surface (inset info panel with recessed label geometry)
 * - Input socket ring on left
 * - Output socket ring on right
 * - State indicator channel on top edge
 */

"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { BackendTaskStatus } from "@/world/adapter/types";
import { useSpatialMissionStore } from "../state/useSpatialMissionStore";

// Use the broader adapter task status type (includes BLOCKED, CANCELLED)
type TaskStatus = BackendTaskStatus;

// ─── Dimensions (metres in scene space) ───────────────────────────────────────
const W = 2.4;   // module width  (X)
const D = 1.4;   // module depth  (Z)
const BASE_H = 0.08;  // base plate height
const BODY_H_DEFAULT = 0.42;  // body height at rest

// State-specific geometry adjustments
const BODY_HEIGHTS: Record<string, number> = {
  RUNNING: 0.52,
  COMPLETED: 0.40,
  FAILED: 0.38,
  PENDING: 0.36,
  READY: 0.44,
  WAITING_APPROVAL: 0.48,
  BLOCKED: 0.32,
  CANCELLED: 0.32,
};

// ─── Material colours (NO NEON — only material state) ─────────────────────────
const COLOURS = {
  basePlate: "#0d0d0f",
  bodyPending:  "#18181c",
  bodyReady:    "#1e1e24",
  bodyRunning:  "#1f2218",   // warm dark green-grey
  bodyDone:     "#1a1e1a",
  bodyFailed:   "#1f1614",   // very dark red-grey
  bodyBlocked:  "#151518",
  bodyApproval: "#1e1c16",  // dark amber-grey

  surfacePending:  "#252530",
  surfaceReady:    "#2a2a38",
  surfaceRunning:  "#2a3022",  // warm mid
  surfaceDone:     "#252e25",
  surfaceFailed:   "#2e201e",
  surfaceBlocked:  "#1e1e26",
  surfaceApproval: "#2e2a1c",

  indicatorPending:  "#3a3a4a",
  indicatorReady:    "#4a4a60",
  indicatorRunning:  "#5a6e40",   // muted olive-green
  indicatorDone:     "#3d5c3d",   // muted green
  indicatorFailed:   "#6e3a38",   // muted dark red
  indicatorBlocked:  "#3a3a50",
  indicatorApproval: "#7a6828",   // muted amber

  socket:        "#2a2a36",
  socketActive:  "#3a4a30",
  socketApproval:"#4a3c18",
  socketFailed:  "#4a2820",

  textPrimary:   "#c8c0b8",
  textSecondary: "#706860",
  textRunning:   "#90a070",
  textDone:      "#70a070",
  textFailed:    "#a06860",
  textApproval:  "#b09040",

  selectedRing:  "#9090a8",
};

function getBodyColor(status: TaskStatus): string {
  switch (status) {
    case "RUNNING":          return COLOURS.bodyRunning;
    case "COMPLETED":        return COLOURS.bodyDone;
    case "FAILED":           return COLOURS.bodyFailed;
    case "WAITING_APPROVAL": return COLOURS.bodyApproval;
    case "READY":            return COLOURS.bodyReady;
    case "BLOCKED":          return COLOURS.bodyBlocked;
    default:                 return COLOURS.bodyPending;
  }
}

function getSurfaceColor(status: TaskStatus): string {
  switch (status) {
    case "RUNNING":          return COLOURS.surfaceRunning;
    case "COMPLETED":        return COLOURS.surfaceDone;
    case "FAILED":           return COLOURS.surfaceFailed;
    case "WAITING_APPROVAL": return COLOURS.surfaceApproval;
    case "READY":            return COLOURS.surfaceReady;
    case "BLOCKED":          return COLOURS.surfaceBlocked;
    default:                 return COLOURS.surfacePending;
  }
}

function getIndicatorColor(status: TaskStatus): string {
  switch (status) {
    case "RUNNING":          return COLOURS.indicatorRunning;
    case "COMPLETED":        return COLOURS.indicatorDone;
    case "FAILED":           return COLOURS.indicatorFailed;
    case "WAITING_APPROVAL": return COLOURS.indicatorApproval;
    case "READY":            return COLOURS.indicatorReady;
    case "BLOCKED":          return COLOURS.indicatorBlocked;
    default:                 return COLOURS.indicatorPending;
  }
}

function getTextColor(status: TaskStatus): string {
  switch (status) {
    case "RUNNING":          return COLOURS.textRunning;
    case "COMPLETED":        return COLOURS.textDone;
    case "FAILED":           return COLOURS.textFailed;
    case "WAITING_APPROVAL": return COLOURS.textApproval;
    default:                 return COLOURS.textPrimary;
  }
}

function getSocketColor(status: TaskStatus): string {
  switch (status) {
    case "RUNNING":          return COLOURS.socketActive;
    case "WAITING_APPROVAL": return COLOURS.socketApproval;
    case "FAILED":           return COLOURS.socketFailed;
    default:                 return COLOURS.socket;
  }
}

// Truncate title to fit top surface
function truncateLabel(title: string, maxLen = 24): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + "…";
}

// ─── Socket (input/output connection point) ────────────────────────────────────
function Socket({
  position,
  color,
  isOutput = false,
}: {
  position: [number, number, number];
  color: string;
  isOutput?: boolean;
}) {
  return (
    <group position={position}>
      {/* Socket ring — recessed cylinder */}
      <mesh>
        <cylinderGeometry args={[0.072, 0.072, 0.06, 8, 1]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.3} />
      </mesh>
      {/* Inner socket dot */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.04, 8, 1]} />
        <meshStandardMaterial
          color={isOutput ? "#3a4a30" : "#2e2e40"}
          roughness={0.7}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── Approval gate (output face indicator) ────────────────────────────────────
function ApprovalGate({ bodyH }: { bodyH: number }) {
  return (
    <group position={[W / 2 + 0.04, bodyH / 2, 0]}>
      {/* Gate bar — horizontal block across the output face */}
      <mesh>
        <boxGeometry args={[0.06, bodyH * 0.6, D * 0.4]} />
        <meshStandardMaterial
          color={COLOURS.indicatorApproval}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      {/* Gate indicator notch */}
      <mesh position={[0.04, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.08]} />
        <meshStandardMaterial color="#8a6a20" roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── Failure disruption indent geometry ───────────────────────────────────────
function FailureDisruption({ bodyH }: { bodyH: number }) {
  return (
    <group position={[0, bodyH + BASE_H + 0.01, 0]}>
      {/* Diagonal crack indent — two narrow wedges offset */}
      <mesh position={[-0.15, 0, 0.05]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.55, 0.025, 0.06]} />
        <meshStandardMaterial color="#0a0608" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0.1, 0, -0.04]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.4, 0.025, 0.05]} />
        <meshStandardMaterial color="#0a0608" roughness={0.9} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ─── State indicator channel (top edge strip) ─────────────────────────────────
function StateChannel({
  status,
  bodyH,
}: {
  status: TaskStatus;
  bodyH: number;
}) {
  const color = getIndicatorColor(status);
  const topY = BASE_H + bodyH + 0.005;

  return (
    <mesh position={[0, topY, -D / 2 + 0.04]}>
      <boxGeometry args={[W * 0.85, 0.012, 0.05]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
    </mesh>
  );
}

// ─── Main TaskBlock3D Component ────────────────────────────────────────────────
export interface TaskBlock3DProps {
  taskId: string;
  title: string;
  status: TaskStatus;
  /** World-space position [x, y, z]. Y should be 0 (grounded on base plane). */
  position: [number, number, number];
  /** Whether this module has any incoming dependency connections */
  hasInputs?: boolean;
  /** Whether this module has any outgoing dependency connections */
  hasOutputs?: boolean;
  /** Called when the user clicks this block */
  onSelect?: (taskId: string) => void;
}

export function TaskBlock3D({
  taskId,
  title,
  status,
  position,
  hasInputs = false,
  hasOutputs = false,
  onSelect,
}: TaskBlock3DProps) {
  const { invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const selectedNodeId = useSpatialMissionStore((s) => s.selectedNodeId);
  const isSelected = selectedNodeId === taskId;

  const bodyH = BODY_HEIGHTS[status] ?? BODY_H_DEFAULT;
  const bodyColor = getBodyColor(status);
  const surfaceColor = getSurfaceColor(status);
  const socketColor = getSocketColor(status);
  const textColor = getTextColor(status);
  const labelText = truncateLabel(title);
  const statusText = status.replace("_", " ");

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      onSelect?.(taskId);
      invalidate();
    },
    [taskId, onSelect, invalidate]
  );

  // Body Y position — sits on top of base plate
  const bodyY = BASE_H + bodyH / 2;
  // Top surface Y
  const topY = BASE_H + bodyH;

  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* ── Base plate ───────────────────────────────────── */}
      <mesh position={[0, BASE_H / 2, 0]} receiveShadow>
        <boxGeometry args={[W + 0.12, BASE_H, D + 0.12]} />
        <meshStandardMaterial
          color={COLOURS.basePlate}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* ── Module body ──────────────────────────────────── */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, bodyH, D]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.82}
          metalness={0.12}
        />
      </mesh>

      {/* ── Top surface panel (inset info layer) ─────────── */}
      <mesh position={[0, topY + 0.018, 0]} receiveShadow>
        <boxGeometry args={[W - 0.14, 0.04, D - 0.14]} />
        <meshStandardMaterial
          color={surfaceColor}
          roughness={0.7}
          metalness={0.08}
        />
      </mesh>

      {/* ── State indicator channel on top edge ──────────── */}
      <StateChannel status={status} bodyH={bodyH} />

      {/* ── Selection ring ───────────────────────────────── */}
      {isSelected && (
        <mesh position={[0, BASE_H - 0.005, 0]}>
          <boxGeometry args={[W + 0.18, 0.008, D + 0.18]} />
          <meshStandardMaterial
            color={COLOURS.selectedRing}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      )}

      {/* ── Input socket (left face) ──────────────────────── */}
      {hasInputs && (
        <Socket
          position={[-W / 2 - 0.025, BASE_H + bodyH * 0.5, 0]}
          color={socketColor}
          isOutput={false}
        />
      )}

      {/* ── Output socket (right face) ───────────────────── */}
      {hasOutputs && (
        <Socket
          position={[W / 2 + 0.025, BASE_H + bodyH * 0.5, 0]}
          color={socketColor}
          isOutput={true}
        />
      )}

      {/* ── Approval gate on output face ─────────────────── */}
      {status === "WAITING_APPROVAL" && <ApprovalGate bodyH={bodyH} />}

      {/* ── Failure disruption indent ─────────────────────── */}
      {status === "FAILED" && <FailureDisruption bodyH={bodyH} />}

      {/* ── Title label (inset on top surface) ───────────── */}
      <Text
        position={[0, topY + 0.06, -0.05]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.14}
        maxWidth={W - 0.2}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        letterSpacing={-0.01}
        lineHeight={1.15}
      >
        {labelText}
      </Text>

      {/* ── Status label (smaller, recessed near front edge) */}
      <Text
        position={[0, topY + 0.055, D / 2 - 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.075}
        color={COLOURS.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        {statusText}
      </Text>
    </group>
  );
}
