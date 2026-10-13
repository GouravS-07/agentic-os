/**
 * AGENTIC OS — TaskBlock3D (Computational Object Redesign)
 *
 * Principle: A TASK IS A COMPUTATIONAL OBJECT, NOT A FLOATING CARD.
 *
 * Three Distinct Visual Layers:
 * 1. STRUCTURAL CHASSIS:
 *    - Layered foundation plinth with 4 corner mounting brackets and bolt heads
 *    - Perimeter containment housing with forward/rear ventilation grilles
 *    - Protruding input (-X) and output (+X) port collars with mechanical attachment locks
 *    - Output Guillotine Barrier Gate physically locking the output port on WAITING_APPROVAL
 *    - Input Blind Flange locking the input port on BLOCKED
 *
 * 2. INFORMATION SURFACE:
 *    - Inset forward placard with compact monospace step badge ("01", "02")
 *    - Concise task title (restrained font size, does not overpower the module)
 *    - Engineering state micro-telemetry ("RUNNING // ACTIVE", "FAULT // SEVERED", etc.)
 *
 * 3. PROCESS CORE:
 *    - Sunken internal core bay cavity with 3 finned processor heat-sink rails
 *    - RUNNING: Elevated engaged posture, active olive titanium core with engaged drive linkages
 *    - COMPLETED: Solid flush seated posture, dual mechanical registry lock pins
 *    - WAITING_APPROVAL: Restrained core behind closed output barrier gate
 *    - FAILED: Physically interrupted, tilted/misaligned core rail, structural shear furrow
 *    - READY/PENDING: Quiet dark graphite standby posture
 */

"use client";

import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import type { SceneStation, BackendTaskStatus } from "@/world/adapter/types";
import { registerActiveTransition, unregisterActiveTransition } from "../SpatialMissionCanvas";

// Structural Physical Dimensions (metres)
export const MODULE_WIDTH = 3.4;
export const MODULE_DEPTH = 2.2;
export const BASE_HEIGHT = 0.12;
export const CHASSIS_HEIGHT = 0.44;
export const TOTAL_MODULE_HEIGHT = BASE_HEIGHT + CHASSIS_HEIGHT; // 0.56m

// Palette: Industrial Computational Graphite / Matte Titanium / Muted Structural Accents
const PALETTE = {
  plinth: "#121520",
  bracket: "#1a1e2c",
  bolt: "#3a4258",
  chassisPerimeter: {
    PENDING: "#202432",
    READY: "#262b3a",
    RUNNING: "#2a3424", // Warm olive-charcoal chassis
    COMPLETED: "#243228", // Solid deep slate-forest chassis
    FAILED: "#342022", // Distressed maroon slate chassis
    WAITING_APPROVAL: "#362e1e", // Controlled dark brass-charcoal chassis
    BLOCKED: "#1e1e26",
    CANCELLED: "#181820",
  },
  deckPlacard: "#181c28",
  coreBayFloor: "#0c0e14",
  coreRail: {
    PENDING: "#222736",
    READY: "#282f42",
    RUNNING: "#3e4c34", // Elevated active titanium
    COMPLETED: "#2a3c2e", // Seated solid registry
    FAILED: "#42282a", // Fractured displaced core
    WAITING_APPROVAL: "#423824", // Gated core
    BLOCKED: "#20202a",
    CANCELLED: "#1a1a22",
  },
  coreFins: {
    PENDING: "#32384a",
    READY: "#3a445c",
    RUNNING: "#688448", // Active olive fin highlights
    COMPLETED: "#4e7656", // Solid locked fin highlights
    FAILED: "#843a3e", // Fractured fin accents
    WAITING_APPROVAL: "#9a7c36", // Gated brass accents
    BLOCKED: "#343444",
    CANCELLED: "#282834",
  },
  portCollar: "#222738",
  portFlange: "#2c3348",
  portSocket: "#141722",
  gatePlate: "#b8903c",
  gateSteel: "#1e222e",
  fractureTrench: "#080608",
  text: {
    badge: "#8c9ab4",
    title: "#e4e5ee",
    state: {
      PENDING: "#68728a",
      READY: "#8896b0",
      RUNNING: "#b4d888",
      COMPLETED: "#98d2a4",
      FAILED: "#e0787c",
      WAITING_APPROVAL: "#e8c268",
      BLOCKED: "#74788c",
      CANCELLED: "#5a5a6a",
    },
  },
  selectionGlow: "#c0cce8",
};

// State Telemetry Strings
const STATE_TELEMETRY: Record<BackendTaskStatus, string> = {
  PENDING: "QUEUED // STANDBY",
  READY: "READY // STANDBY",
  RUNNING: "EXEC // ACTIVE",
  COMPLETED: "REGISTRY // LOCKED",
  FAILED: "FAULT // SEVERED",
  WAITING_APPROVAL: "INTERLOCK // HELD",
  BLOCKED: "BUS // BLOCKED",
  CANCELLED: "ABORT // HALTED",
};

// ── 1. Corner Mounting Bracket with Bolt Heads ──
function CornerBracket({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, BASE_HEIGHT / 2, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.26, BASE_HEIGHT + 0.04, 0.26]} />
        <meshStandardMaterial color={PALETTE.bracket} roughness={0.78} metalness={0.4} />
      </mesh>
      {/* Fastener Bolt */}
      <mesh position={[0, BASE_HEIGHT / 2 + 0.025, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 8]} />
        <meshStandardMaterial color={PALETTE.bolt} roughness={0.45} metalness={0.65} />
      </mesh>
    </group>
  );
}

// ── 2. Heavy Input / Output Port Collar Assembly ──
function ModulePortAssembly({
  stationId,
  isOutput,
  hasConnection,
  isBlocked,
  isApprovalGated,
  prefersReducedMotion = false,
}: {
  stationId: string;
  isOutput: boolean;
  hasConnection: boolean;
  isBlocked: boolean;
  isApprovalGated: boolean;
  prefersReducedMotion?: boolean;
}) {
  const xPos = isOutput ? MODULE_WIDTH / 2 : -MODULE_WIDTH / 2;
  const collarRot: [number, number, number] = isOutput
    ? [0, 0, -Math.PI / 2]
    : [0, 0, Math.PI / 2];

  const gatePlateGroupRef = useRef<THREE.Group>(null);
  const currentGateY = useRef(isApprovalGated ? 0 : 0.42);
  const transitionKey = `${stationId}_gate`;

  useEffect(() => {
    return () => {
      unregisterActiveTransition(transitionKey);
    };
  }, [transitionKey]);

  useFrame((_, delta) => {
    if (gatePlateGroupRef.current && isOutput) {
      const targetY = isApprovalGated ? 0 : 0.42;
      if (prefersReducedMotion) {
        currentGateY.current = targetY;
        unregisterActiveTransition(transitionKey);
      } else {
        const diff = targetY - currentGateY.current;
        if (Math.abs(diff) > 0.002) {
          registerActiveTransition(transitionKey);
          currentGateY.current += diff * Math.min(1, 14 * delta);
        } else {
          currentGateY.current = targetY;
          unregisterActiveTransition(transitionKey);
        }
      }
      gatePlateGroupRef.current.position.y = currentGateY.current;
    }
  });

  return (
    <group position={[xPos, BASE_HEIGHT + CHASSIS_HEIGHT * 0.48, 0]}>
      {/* Heavy Rectangular Port Bulkhead */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.58, 0.58]} />
        <meshStandardMaterial color={PALETTE.portFlange} roughness={0.75} metalness={0.35} />
      </mesh>

      {/* Protruding Cylindrical Port Collar */}
      <mesh position={[isOutput ? 0.12 : -0.12, 0, 0]} rotation={collarRot} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.24, 16]} />
        <meshStandardMaterial color={PALETTE.portCollar} roughness={0.68} metalness={0.45} />
      </mesh>

      {/* Outer Flange Clamp Ring */}
      <mesh position={[isOutput ? 0.20 : -0.20, 0, 0]} rotation={collarRot}>
        <cylinderGeometry args={[0.25, 0.25, 0.06, 16]} />
        <meshStandardMaterial color={PALETTE.portFlange} roughness={0.55} metalness={0.5} />
      </mesh>

      {/* Inner Recessed Socket Cavity */}
      <mesh position={[isOutput ? 0.23 : -0.23, 0, 0]} rotation={collarRot}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 16]} />
        <meshStandardMaterial
          color={hasConnection ? "#1e281e" : PALETTE.portSocket}
          roughness={0.88}
          metalness={0.2}
        />
      </mesh>

      {/* Physical Barrier Gate (WAITING_APPROVAL) clamping output port */}
      {isOutput && isApprovalGated && (
        <group position={[0.26, 0, 0]}>
          {/* Vertical Guillotine Gate Guide Uprights (fixed structural guides) */}
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.10, 0.52, 0.44]} />
            <meshStandardMaterial color={PALETTE.gateSteel} roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Clamped Interlock Barrier Plate & Locking Pin (animated drop) */}
          <group ref={gatePlateGroupRef}>
            <mesh position={[0.02, 0, 0]} castShadow>
              <boxGeometry args={[0.06, 0.42, 0.40]} />
              <meshStandardMaterial color={PALETTE.gatePlate} roughness={0.45} metalness={0.65} />
            </mesh>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.10, 8]} />
              <meshStandardMaterial color="#d4aa48" roughness={0.35} metalness={0.7} />
            </mesh>
          </group>
        </group>
      )}

      {/* Blind Lock Plate for BLOCKED Input Port */}
      {!isOutput && isBlocked && (
        <group position={[-0.24, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.42, 0.42]} />
            <meshStandardMaterial color="#443838" roughness={0.8} metalness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ── 3. Internal Process Core Assembly ──
function ProcessCoreAssembly({
  stationId,
  status,
  prefersReducedMotion = false,
}: {
  stationId: string;
  status: BackendTaskStatus;
  prefersReducedMotion?: boolean;
}) {
  const isRunning = status === "RUNNING";
  const isCompleted = status === "COMPLETED";
  const isFailed = status === "FAILED";
  const isApproval = status === "WAITING_APPROVAL";

  const coreColor = PALETTE.coreRail[status] || PALETTE.coreRail.PENDING;
  const finColor = PALETTE.coreFins[status] || PALETTE.coreFins.PENDING;

  // Target core elevation
  const targetElevation = isRunning ? 0.15 : isCompleted ? 0.03 : isFailed ? -0.04 : 0.05;
  const currentElevation = useRef(targetElevation);
  const tiltProgress = useRef(isFailed ? 1 : 0);
  const coreGroupRef = useRef<THREE.Group>(null);
  const centerRailRef = useRef<THREE.Group>(null);
  const finMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const elevKey = `${stationId}_elevation`;
  const tiltKey = `${stationId}_tilt`;

  useEffect(() => {
    return () => {
      unregisterActiveTransition(elevKey);
      unregisterActiveTransition(tiltKey);
    };
  }, [elevKey, tiltKey]);

  useFrame((state, delta) => {
    // 1. Core elevation glide transition
    if (prefersReducedMotion) {
      currentElevation.current = targetElevation;
      unregisterActiveTransition(elevKey);
    } else {
      const diffElev = targetElevation - currentElevation.current;
      if (Math.abs(diffElev) > 0.001) {
        registerActiveTransition(elevKey);
        currentElevation.current += diffElev * Math.min(1, 10 * delta);
      } else {
        currentElevation.current = targetElevation;
        unregisterActiveTransition(elevKey);
      }
    }
    if (coreGroupRef.current) {
      coreGroupRef.current.position.y = BASE_HEIGHT + 0.14 + currentElevation.current;
    }

    // 2. Center rail failure tilt transition
    if (centerRailRef.current) {
      const targetProgress = isFailed ? 1 : 0;
      const targetTiltX = 0.08;
      const targetTiltY = -0.12;
      const targetTiltZ = 0.14;
      const targetY = -0.06;

      if (prefersReducedMotion) {
        tiltProgress.current = targetProgress;
        centerRailRef.current.rotation.set(
          targetTiltX * targetProgress,
          targetTiltY * targetProgress,
          targetTiltZ * targetProgress
        );
        centerRailRef.current.position.y = targetY * targetProgress;
        unregisterActiveTransition(tiltKey);
      } else {
        const diffProgress = targetProgress - tiltProgress.current;
        if (Math.abs(diffProgress) > 0.002) {
          registerActiveTransition(tiltKey);
          tiltProgress.current += diffProgress * Math.min(1, 10 * delta);
        } else {
          tiltProgress.current = targetProgress;
          unregisterActiveTransition(tiltKey);
        }
        centerRailRef.current.rotation.set(
          targetTiltX * tiltProgress.current,
          targetTiltY * tiltProgress.current,
          targetTiltZ * tiltProgress.current
        );
        centerRailRef.current.position.y = targetY * tiltProgress.current;
      }
    }

    // 3. Active fin respiration pulse (RUNNING state)
    if (finMatRef.current && isRunning) {
      if (prefersReducedMotion) {
        finMatRef.current.emissiveIntensity = 0.25;
      } else {
        const breath = Math.sin(state.clock.elapsedTime * 3.2) * 0.5 + 0.5;
        finMatRef.current.emissiveIntensity = 0.2 + 0.45 * breath;
      }
    }
  });

  return (
    <group ref={coreGroupRef} position={[0, BASE_HEIGHT + 0.14 + targetElevation, -0.12]}>
      {/* ── Sunken Core Bay Cavity Floor ── */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[2.3, 0.06, 1.35]} />
        <meshStandardMaterial color={PALETTE.coreBayFloor} roughness={0.94} metalness={0.1} />
      </mesh>

      {/* ── Structural Circuit Shear Trench (FAILED state) ── */}
      {isFailed && (
        <group position={[0, -0.04, 0]}>
          <mesh rotation={[0, 0.38, 0]}>
            <boxGeometry args={[1.6, 0.04, 0.14]} />
            <meshStandardMaterial color={PALETTE.fractureTrench} roughness={0.98} metalness={0.05} />
          </mesh>
          <mesh position={[0.2, 0, 0.25]} rotation={[0, -0.42, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.10]} />
            <meshStandardMaterial color={PALETTE.fractureTrench} roughness={0.98} metalness={0.05} />
          </mesh>
        </group>
      )}

      {/* ── Longitudinal Processor Heat-Sink Rails (3 units) ── */}
      {[-0.68, 0, 0.68].map((xOffset, railIdx) => {
        const isCenterRail = railIdx === 1;
        const tiltRot: [number, number, number] =
          isFailed && isCenterRail ? [0.08, -0.12, 0.14] : [0, 0, 0];
        const yOffset = isFailed && isCenterRail ? -0.06 : 0;

        return (
          <group
            key={railIdx}
            ref={isCenterRail ? centerRailRef : undefined}
            position={[xOffset, yOffset, 0]}
            rotation={tiltRot}
          >
            {/* Core Body Rail */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.42, 0.22, 1.05]} />
              <meshStandardMaterial color={coreColor} roughness={0.65} metalness={0.35} />
            </mesh>

            {/* Slotted Transverse Heat Sink Fins (6 fins per rail) */}
            {[-0.38, -0.22, -0.06, 0.10, 0.26, 0.42].map((zOffset, finIdx) => (
              <mesh key={finIdx} position={[0, 0.12, zOffset]} castShadow>
                <boxGeometry args={[0.46, 0.06, 0.04]} />
                <meshStandardMaterial
                  ref={isCenterRail && finIdx === 0 ? finMatRef : undefined}
                  color={finColor}
                  emissive={isRunning ? "#445a28" : "#000000"}
                  emissiveIntensity={isRunning ? 0.35 : 0}
                  roughness={0.52}
                  metalness={0.45}
                />
              </mesh>
            ))}

            {/* Central Bus Rod Conduit */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 1.15, 8]} />
              <meshStandardMaterial color="#4a5266" roughness={0.35} metalness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* ── Active Mechanical Linkages (RUNNING state) ── */}
      {isRunning && (
        <group position={[0, 0.18, 0]}>
          <mesh position={[-1.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.32, 8]} />
            <meshStandardMaterial color="#88a860" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[1.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.32, 8]} />
            <meshStandardMaterial color="#88a860" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      )}

      {/* ── Solid Registry Lock Pins (COMPLETED state) ── */}
      {isCompleted && (
        <group position={[0, 0.08, 0]}>
          {[-0.95, 0.95].map((xPin, pIdx) => (
            <mesh key={pIdx} position={[xPin, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.16, 8]} />
              <meshStandardMaterial color="#5a7e60" roughness={0.45} metalness={0.65} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// ── 4. Main Component: TaskBlock3D ──
export interface TaskBlock3DProps {
  station: SceneStation;
  position: [number, number, number];
  hasInputs?: boolean;
  hasOutputs?: boolean;
  isSelected?: boolean;
  isPrerequisite?: boolean;
  isDependent?: boolean;
  isDimmed?: boolean;
  prefersReducedMotion?: boolean;
  onSelect?: (stationId: string) => void;
}

export function TaskBlock3D({
  station,
  position,
  hasInputs = false,
  hasOutputs = false,
  isSelected = false,
  isPrerequisite = false,
  isDependent = false,
  isDimmed = false,
  prefersReducedMotion = false,
  onSelect,
}: TaskBlock3DProps) {
  const { invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  const status = station.state;
  const statusTelemetry = station.isRecovery
    ? status === "COMPLETED"
      ? "RECOVERY // RESOLVED"
      : status === "RUNNING"
      ? "RECOVERY // ACTIVE"
      : status === "READY"
      ? "RECOVERY // READY"
      : status === "FAILED"
      ? "RECOVERY // EXHAUSTED"
      : status === "WAITING_APPROVAL"
      ? "RECOVERY // HELD"
      : "RECOVERY // INJECTED"
    : STATE_TELEMETRY[status] || "STANDBY";
  const perimeterColor = station.isRecovery
    ? "#30243c"
    : PALETTE.chassisPerimeter[status] || PALETTE.chassisPerimeter.PENDING;
  const stateTextColor = station.isRecovery
    ? "#c084fc"
    : (PALETTE.text.state as any)[status] || PALETTE.text.state.PENDING;

  // Extract compact task index badge: "1. Provision..." -> "01", or "RCV" for recovery injection
  const { taskIndex, displayTitle } = useMemo(() => {
    if (station.isRecovery) {
      const match = station.title.match(/^(\d+)\.\s*(.*)/);
      if (match) {
        return { taskIndex: "RCV", displayTitle: match[2] };
      }
      return { taskIndex: "RCV", displayTitle: station.title.replace(/^Fix & Recover:\s*/i, "Recover: ") };
    }
    const match = station.title.match(/^(\d+)\.\s*(.*)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const padded = num < 10 ? `0${num}` : `${num}`;
      return { taskIndex: padded, displayTitle: match[2] };
    }
    return { taskIndex: "--", displayTitle: station.title };
  }, [station.title, station.isRecovery]);

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      onSelect?.(station.id);
      invalidate();
    },
    [station.id, onSelect, invalidate]
  );

  const handlePointerOver = useCallback(
    (e: any) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
      setIsHovered(true);
      invalidate();
    },
    [invalidate]
  );

  const handlePointerOut = useCallback(
    (e: any) => {
      document.body.style.cursor = "auto";
      setIsHovered(false);
      invalidate();
    },
    [invalidate]
  );

  // Selected lift elevation (+0.16m), prerequisite lift (+0.05m)
  const elevation = isSelected ? 0.16 : isPrerequisite ? 0.05 : 0;
  const finalPos: [number, number, number] = [
    position[0],
    position[1] + elevation,
    position[2],
  ];

  const fillOpacity = isDimmed ? 0.35 : 1.0;

  return (
    <group
      ref={groupRef}
      position={finalPos}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* ── GROUND CONTACT SHADOW BASE PLATE ── */}
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[MODULE_WIDTH + 0.6, MODULE_DEPTH + 0.6]} />
        <meshBasicMaterial
          color="#07090e"
          transparent
          opacity={isDimmed ? 0.28 : isSelected ? 0.85 : 0.65}
        />
      </mesh>

      {/* ── LAYER 1: STRUCTURAL CHASSIS ── */}

      {/* Stepped Sub-Chassis Plinth */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[MODULE_WIDTH + 0.16, BASE_HEIGHT, MODULE_DEPTH + 0.16]} />
        <meshStandardMaterial color={PALETTE.plinth} roughness={0.88} metalness={0.25} />
      </mesh>

      {/* 4 Heavy Corner Mounting Brackets */}
      <CornerBracket x={-(MODULE_WIDTH / 2) + 0.08} z={-(MODULE_DEPTH / 2) + 0.08} />
      <CornerBracket x={MODULE_WIDTH / 2 - 0.08} z={-(MODULE_DEPTH / 2) + 0.08} />
      <CornerBracket x={-(MODULE_WIDTH / 2) + 0.08} z={MODULE_DEPTH / 2 - 0.08} />
      <CornerBracket x={MODULE_WIDTH / 2 - 0.08} z={MODULE_DEPTH / 2 - 0.08} />

      {/* Perimeter Housing Walls (forming the central bay) */}
      <group position={[0, BASE_HEIGHT + CHASSIS_HEIGHT / 2, 0]}>
        {/* Left Bulkhead Wall */}
        <mesh position={[-MODULE_WIDTH / 2 + 0.24, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.48, CHASSIS_HEIGHT, MODULE_DEPTH]} />
          <meshStandardMaterial color={perimeterColor} roughness={0.72} metalness={0.28} />
        </mesh>
        {/* Right Bulkhead Wall */}
        <mesh position={[MODULE_WIDTH / 2 - 0.24, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.48, CHASSIS_HEIGHT, MODULE_DEPTH]} />
          <meshStandardMaterial color={perimeterColor} roughness={0.72} metalness={0.28} />
        </mesh>
        {/* Rear Wall with Service Grille */}
        <mesh position={[0, 0, -MODULE_DEPTH / 2 + 0.18]} castShadow receiveShadow>
          <boxGeometry args={[MODULE_WIDTH - 0.96, CHASSIS_HEIGHT, 0.36]} />
          <meshStandardMaterial color={perimeterColor} roughness={0.78} metalness={0.22} />
        </mesh>
        {/* Front Wall with Heat Dissipation Slots */}
        <mesh position={[0, 0, MODULE_DEPTH / 2 - 0.22]} castShadow receiveShadow>
          <boxGeometry args={[MODULE_WIDTH - 0.96, CHASSIS_HEIGHT, 0.44]} />
          <meshStandardMaterial color={perimeterColor} roughness={0.78} metalness={0.22} />
        </mesh>
      </group>

      {/* Input Port Assembly (-X) */}
      <ModulePortAssembly
        stationId={station.id}
        isOutput={false}
        hasConnection={hasInputs}
        isBlocked={status === "BLOCKED"}
        isApprovalGated={false}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Output Port Assembly (+X) */}
      <ModulePortAssembly
        stationId={station.id}
        isOutput={true}
        hasConnection={hasOutputs}
        isBlocked={false}
        isApprovalGated={station.hasApprovalBarrier || status === "WAITING_APPROVAL"}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* ── LAYER 3: INTERNAL PROCESS CORE ── */}
      <ProcessCoreAssembly
        stationId={station.id}
        status={status}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* ── LAYER 2: INFORMATION SURFACE (Inset Forward Deck Placard) ── */}
      <group position={[0, BASE_HEIGHT + CHASSIS_HEIGHT + 0.008, MODULE_DEPTH / 2 - 0.24]}>
        {/* Inset Titanium Label Placard */}
        <mesh receiveShadow>
          <boxGeometry args={[MODULE_WIDTH - 0.7, 0.02, 0.36]} />
          <meshStandardMaterial color={PALETTE.deckPlacard} roughness={0.62} metalness={0.35} />
        </mesh>

        {/* Step Index Badge (e.g. "01" or "RCV") */}
        <Text
          position={[-MODULE_WIDTH / 2 + 0.58, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={station.isRecovery ? 0.095 : 0.11}
          color={station.isRecovery ? "#c084fc" : PALETTE.text.badge}
          fillOpacity={fillOpacity}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          {taskIndex}
        </Text>

        {/* Engineering Recovery Trim */}
        {station.isRecovery && (
          <mesh position={[0, 0.015, -0.17]}>
            <boxGeometry args={[MODULE_WIDTH - 0.74, 0.006, 0.02]} />
            <meshStandardMaterial color="#a855f7" roughness={0.4} metalness={0.6} transparent opacity={fillOpacity} />
          </mesh>
        )}

        {/* Divider Tick */}
        <mesh position={[-MODULE_WIDTH / 2 + 0.74, 0.015, 0]}>
          <boxGeometry args={[0.015, 0.01, 0.16]} />
          <meshStandardMaterial color="#4a5266" roughness={0.5} transparent opacity={fillOpacity} />
        </mesh>

        {/* Concise Task Title (Left side) */}
        <Text
          position={[-MODULE_WIDTH / 2 + 0.84, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.115}
          maxWidth={MODULE_WIDTH - 2.1}
          color={PALETTE.text.title}
          fillOpacity={fillOpacity}
          anchorX="left"
          anchorY="middle"
          letterSpacing={-0.01}
          lineHeight={1.05}
        >
          {displayTitle}
        </Text>

        {/* Engineering State Telemetry (Right-aligned badge) */}
        <Text
          position={[MODULE_WIDTH / 2 - 0.52, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.085}
          color={stateTextColor}
          fillOpacity={fillOpacity}
          anchorX="right"
          anchorY="middle"
          letterSpacing={0.06}
        >
          {statusTelemetry}
        </Text>
      </group>

      {/* ── ACTIVE SELECTION BOUNDARY HIGHLIGHT ── */}
      {isSelected && (
        <group position={[0, BASE_HEIGHT / 2, 0]}>
          <mesh>
            <boxGeometry args={[MODULE_WIDTH + 0.28, 0.02, MODULE_DEPTH + 0.28]} />
            <meshStandardMaterial
              color={PALETTE.selectionGlow}
              roughness={0.35}
              metalness={0.6}
            />
          </mesh>
        </group>
      )}

      {/* ── PREREQUISITE ROUTE HIGHLIGHT ── */}
      {isPrerequisite && !isSelected && (
        <group position={[0, BASE_HEIGHT / 2, 0]}>
          <mesh>
            <boxGeometry args={[MODULE_WIDTH + 0.18, 0.015, MODULE_DEPTH + 0.18]} />
            <meshStandardMaterial
              color="#38749a"
              roughness={0.45}
              metalness={0.55}
            />
          </mesh>
        </group>
      )}

      {/* ── HOVER BOUNDARY ACCENT ── */}
      {isHovered && !isSelected && !isPrerequisite && (
        <group position={[0, BASE_HEIGHT / 2, 0]}>
          <mesh>
            <boxGeometry args={[MODULE_WIDTH + 0.12, 0.01, MODULE_DEPTH + 0.12]} />
            <meshStandardMaterial
              color="#3a4456"
              roughness={0.6}
              metalness={0.4}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
