"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "../../state/worldStore";

/**
 * 3D Precision Industrial Machine Districts
 * Architectural computational mechanisms with physical structural depth.
 * STRICT IDLE RULE: When idle, the machine is completely still (0 RAF drift).
 * Mechanisms actuate ONLY upon real user interaction or real backend state changes.
 */
export const Districts: React.FC = () => {
  const { selectDistrict, openDocket } = useWorldStore();

  return (
    <group name="district-machine-modules">
      {/* ================================================================= */}
      {/* 1. SYSTEM CONTROL MODULE (Central Authority at [0, 0, 0])           */}
      {/* ================================================================= */}
      <group
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("CONTROL");
          openDocket({
            type: "MISSION",
            id: "CONTROL",
            title: "System Control Module & Interlocking Linkage",
            meta: {
              signage: "SYSTEM CONTROL [KEY 1]",
              authority: "Permission Guard, State Machine, Cryptographic Execution Lock",
              status: "NOMINAL · ALL INTERLOCKS ENGAGED",
            },
          });
        }}
      >
        {/* Foundation Stepped Basalt Base (#161619) */}
        <mesh position={[0, 0.4, -14]} castShadow receiveShadow>
          <boxGeometry args={[32, 0.8, 22]} />
          <meshStandardMaterial color="#161619" roughness={0.85} metalness={0.2} />
        </mesh>

        {/* Stepped Tower Core Chassis (#232328) */}
        <mesh position={[0, 2.4, -14]} castShadow receiveShadow>
          <boxGeometry args={[26, 3.2, 16]} />
          <meshStandardMaterial color="#232328" roughness={0.7} metalness={0.35} />
        </mesh>

        {/* Vertical Heat Dissipation Ribs on Tower Flanks */}
        {[-13.1, 13.1].map((fx, fi) => (
          <group key={`ctrl-ribs-${fi}`} position={[fx, 2.4, -14]}>
            {[-6, -3, 0, 3, 6].map((rz, ri) => (
              <mesh key={`rib-${ri}`} position={[0, 0, rz]} castShadow>
                <boxGeometry args={[0.3, 2.8, 1.2]} />
                <meshStandardMaterial color="#4A4A52" metalness={0.7} roughness={0.3} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Cantilevered Observation Gallery (Ivory Ceramic #E8E2D2) */}
        <mesh position={[0, 5.2, -14]} castShadow receiveShadow>
          <boxGeometry args={[30, 2.4, 18]} />
          <meshStandardMaterial color="#E8E2D2" roughness={0.88} />
        </mesh>

        {/* Dark Smoked Sensor Glazing Slit (#101012) */}
        <mesh position={[0, 5.2, -4.9]}>
          <boxGeometry args={[28, 0.9, 0.4]} />
          <meshBasicMaterial color="#101012" />
        </mesh>

        {/* Machined Graphite Roof Canopy with Inset Radiator (#1A1A1E) */}
        <mesh position={[0, 6.6, -14]} castShadow>
          <boxGeometry args={[32, 0.4, 20]} />
          <meshStandardMaterial color="#1A1A1E" roughness={0.6} metalness={0.5} />
        </mesh>

        {/* APEX MECHANICAL GOVERNOR ESCAPEMENT (Locked resting position) */}
        <group position={[0, 7.6, -14]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.4, 12]} />
            <meshStandardMaterial color="#3A3942" metalness={0.85} roughness={0.25} />
          </mesh>
          {[-1.8, 1.8].map((gx, gi) => (
            <group key={`gov-arm-${gi}`} position={[gx, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[1.6, 0.15, 0.3]} />
                <meshStandardMaterial color="#6E6D74" metalness={0.8} />
              </mesh>
              <mesh position={[gx > 0 ? 0.8 : -0.8, 0, 0]} castShadow>
                <sphereGeometry args={[0.42, 10, 10]} />
                <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Ground Mechanical Linkage Bed Plate (Machined Steel #6E6D74) */}
        <mesh position={[0, 0.35, 7.5]} receiveShadow castShadow>
          <boxGeometry args={[24, 0.6, 8.0]} />
          <meshStandardMaterial color="#6E6D74" roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Mechanical Lever Slit Channel */}
        <mesh position={[0, 0.66, 7.5]}>
          <boxGeometry args={[20, 0.05, 1.2]} />
          <meshBasicMaterial color="#121214" />
        </mesh>

        {/* 10 Precision Mechanical Actuator Levers with Brass Linkages */}
        {[-7.2, -5.6, -4.0, -2.4, -0.8, 0.8, 2.4, 4.0, 5.6, 7.2].map((lx, i) => (
          <group
            key={`ctrl-lever-${i}`}
            position={[lx, 0.65, 7.5]}
          >
            {/* Pivot Knuckle Flange */}
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
              <meshStandardMaterial color="#3A3A42" metalness={0.8} />
            </mesh>
            {/* Articulated Lever Shaft (Fixed precision position) */}
            <mesh position={[0, 0.85, i % 3 === 0 ? 0.3 : -0.2]} rotation={[i % 3 === 0 ? 0.35 : -0.25, 0, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 1.7, 8]} />
              <meshStandardMaterial color="#1A1A1E" metalness={0.9} />
            </mesh>
            {/* Machined Brass / Red Actuator Knob */}
            <mesh position={[0, 1.7, i % 3 === 0 ? 0.6 : -0.45]} castShadow>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#C5A059" : "#A63A32"}
                metalness={0.8}
                roughness={0.25}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================================================================= */}
      {/* 2. LAYOUT SYNTHESIS GANTRY (at x = -70, z = -20)                   */}
      {/* ================================================================= */}
      <group
        position={[-70, 0, -20]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("PLANNING_GANTRY");
          openDocket({
            type: "MISSION",
            id: "PLANNING_GANTRY",
            title: "Layout Synthesis Gantry",
            meta: {
              signage: "SYNTHESIS GANTRY [KEY 3]",
              agent: "Mission Planner Core",
              role: "Goal Decomposition, DAG Synthesis, Topological Routing",
            },
          });
        }}
      >
        {/* West Heavy Steel Support Pier */}
        <mesh position={[-11, 4.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 9.6, 4.0]} />
          <meshStandardMaterial color="#232328" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[-11, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.5, 0.8, 5.2]} />
          <meshStandardMaterial color="#161619" roughness={0.8} />
        </mesh>

        {/* East Heavy Steel Support Pier */}
        <mesh position={[11, 4.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 9.6, 4.0]} />
          <meshStandardMaterial color="#232328" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[11, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.5, 0.8, 5.2]} />
          <meshStandardMaterial color="#161619" roughness={0.8} />
        </mesh>

        {/* Overhead Gantry Bridge Truss (Ivory Ceramic #E8E2D2) */}
        <mesh position={[0, 9.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[26, 2.0, 5.5]} />
          <meshStandardMaterial color="#E8E2D2" roughness={0.85} />
        </mesh>

        {/* Overhead Cable Conduit Tray */}
        <mesh position={[0, 10.2, 0]} castShadow>
          <boxGeometry args={[24, 0.4, 2.4]} />
          <meshStandardMaterial color="#161619" roughness={0.5} metalness={0.7} />
        </mesh>

        {/* Optical Scanning Carriage (Stationary in Parked Dock when idle) */}
        <group position={[0, 8.0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[3.2, 1.2, 3.2]} />
            <meshStandardMaterial color="#1A1A1E" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.7, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.7, 0.6, 12]} />
            <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -1.05, 0]}>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshBasicMaterial color="#C98A2B" />
          </mesh>
        </group>

        {/* 3 Optical Scanning Lenses on Gantry Underbelly */}
        {[-7, 0, 7].map((gx, i) => (
          <group key={`gantry-lens-${i}`} position={[gx, 8.8, 2.9]}>
            <mesh castShadow>
              <boxGeometry args={[1.4, 1.4, 0.6]} />
              <meshStandardMaterial color="#1A1A1E" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.35]}>
              <sphereGeometry args={[0.32, 12, 12]} />
              <meshBasicMaterial color={i === 1 ? "#C98A2B" : "#B5B3AC"} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================================================================= */}
      {/* 3. CARRIER STAGING BAY (Fleet Berths at x = -30, z = 60)           */}
      {/* ================================================================= */}
      <group
        position={[-30, 0, 60]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("AGENT_DEPOT");
          openDocket({
            type: "AGENT",
            id: "AGENT_DEPOT",
            title: "Autonomous Fleet Staging Bay",
            meta: {
              signage: "STAGING BAY [KEY 4]",
              registered_fleet: "5 Carrier Modules (PLANNER, CODER, REVIEWER, RESEARCHER, EXECUTOR)",
              status: "ALL CARRIERS DOCKED IN BERTHS",
            },
          });
        }}
      >
        {/* Recessed Platform Base (#141417) */}
        <mesh position={[0, 0.15, 0]} receiveShadow>
          <boxGeometry args={[56, 0.3, 34]} />
          <meshStandardMaterial color="#141417" roughness={0.9} />
        </mesh>

        {/* Machined Steel Perimeter Curb (#6E6D74) */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[56.6, 0.18, 34.6]} />
          <meshStandardMaterial color="#6E6D74" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* 5 Precision Docked Computational Carriers with Articulated Calipers */}
        {[-19, -9.5, 0, 9.5, 19].map((offset, i) => (
          <group key={`berth-bay-${i}`} position={[offset, 0.6, 0]}>
            {/* Guide Rail Trough */}
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[6.8, 0.15, 20]} />
              <meshStandardMaterial color="#1C1C20" roughness={0.8} />
            </mesh>

            {/* Carrier Vehicle Chassis (Dark Graphite #232328) */}
            <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
              <boxGeometry args={[5.2, 1.1, 15]} />
              <meshStandardMaterial color="#232328" roughness={0.65} metalness={0.35} />
            </mesh>

            {/* Top Instrument Core (Ivory Composite #E8E2D2) */}
            <mesh position={[0, 1.3, 0]} castShadow>
              <boxGeometry args={[4.4, 0.3, 12]} />
              <meshStandardMaterial color="#E8E2D2" roughness={0.85} />
            </mesh>

            {/* Brass Clamping Calipers */}
            {[-2.7, 2.7].map((cx, ci) => (
              <mesh key={`caliper-${ci}`} position={[cx, 0.8, 0]} castShadow>
                <boxGeometry args={[0.35, 0.8, 4.0]} />
                <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.25} />
              </mesh>
            ))}

            {/* Brass Power Contact Lugs */}
            <mesh position={[0, 1.5, 4.8]}>
              <cylinderGeometry args={[0.22, 0.22, 0.15, 8]} />
              <meshStandardMaterial color="#C5A059" metalness={0.85} />
            </mesh>

            {/* Optical Carrier Headlamp */}
            <mesh position={[0, 0.85, 7.6]}>
              <sphereGeometry args={[0.32, 8, 8]} />
              <meshBasicMaterial color="#B0AEA8" />
            </mesh>
          </group>
        ))}

        {/* Overhead Heavy Crane Runway Girder Spanning Berths */}
        <mesh position={[0, 4.8, 0]} castShadow>
          <boxGeometry args={[54, 0.6, 1.4]} />
          <meshStandardMaterial color="#6E6D74" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 4. TOOL MATRIX MODULE (Sandboxed Facility at x = 80, z = -10)      */}
      {/* ================================================================= */}
      <group
        position={[80, 0, -10]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("TOOL_WORKSHOP");
          openDocket({
            type: "MISSION",
            id: "TOOL_WORKSHOP",
            title: "Tool Matrix Execution Subsystem",
            meta: {
              signage: "TOOL MATRIX [KEY 5]",
              perimeter: "Sandboxed Tool Runtime Environment",
              tools: "Filesystem, Terminal, Git, Web Search, GitHub Mock",
            },
          });
        }}
      >
        {/* Foundation Plinth */}
        <mesh position={[0, 0.2, 0]} receiveShadow>
          <boxGeometry args={[48, 0.4, 36]} />
          <meshStandardMaterial color="#141416" roughness={0.9} />
        </mesh>

        {/* Perimeter Machined Rail (#6E6D74) */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[48.6, 0.15, 36.6]} />
          <meshStandardMaterial color="#6E6D74" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* 3 Tool Execution Matrix Units */}
        {[-14, 0, 14].map((bx, i) => (
          <group key={`tool-cabinet-${i}`} position={[bx, 0, 0]}>
            {/* Unit Cabinet Chassis */}
            <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
              <boxGeometry args={[9.0, 3.4, 18]} />
              <meshStandardMaterial color="#232328" roughness={0.7} metalness={0.35} />
            </mesh>

            {/* Cooling Fan Housing (Stationary when idle) */}
            <group position={[0, 3.9, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[2.2, 2.2, 0.25, 12]} />
                <meshStandardMaterial color="#1A1A1E" metalness={0.9} roughness={0.2} />
              </mesh>
              {[-1.5, 0, 1.5].map((bx, bi) => (
                <mesh key={`fan-blade-${bi}`} position={[0, 0.1, 0]} rotation={[0, (bi * Math.PI) / 3, 0]}>
                  <boxGeometry args={[3.8, 0.08, 0.4]} />
                  <meshStandardMaterial color="#7A787F" metalness={0.8} />
                </mesh>
              ))}
            </group>

            {/* Vertical Extruded Aluminium Heat Sink Fins */}
            {[-6, -4, -2, 0, 2, 4, 6].map((vz, vi) => (
              <mesh key={`sink-fin-${vi}`} position={[0, 3.8, vz]}>
                <boxGeometry args={[8.2, 0.2, 0.5]} />
                <meshStandardMaterial color="#B0AEA8" metalness={0.85} roughness={0.25} />
              </mesh>
            ))}

            {/* Front Tool Cartridge Bays (Recessed) */}
            <mesh position={[0, 1.8, 9.1]}>
              <boxGeometry args={[7.0, 1.8, 0.3]} />
              <meshStandardMaterial color="#101012" roughness={0.9} />
            </mesh>

            {/* Status Indicator LED */}
            <mesh position={[0, 3.0, 9.1]}>
              <sphereGeometry args={[0.22, 8, 8]} />
              <meshBasicMaterial color="#10B981" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================================================================= */}
      {/* 5. FAULT ISOLATION UNIT (Triage at x = 100, z = 70)                 */}
      {/* ================================================================= */}
      <group
        position={[100, 0, 70]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("FAILURE_HOUSE");
          openDocket({
            type: "MISSION",
            id: "FAILURE_HOUSE",
            title: "Fault Isolation & Root Cause Triage",
            meta: {
              signage: "FAULT ISOLATION [KEY 6]",
              service: "FailureAnalyzer, Error Classification, Remediation Engine",
              loop: "South Autonomous Remediation Loop",
            },
          });
        }}
      >
        {/* Heavy Blast-Ribbed Containment Base */}
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[28, 4.4, 20]} />
          <meshStandardMaterial color="#232328" roughness={0.75} metalness={0.35} />
        </mesh>

        {/* Hazard Red Header Band (#A63A32) */}
        <mesh position={[0, 4.5, 0]} castShadow>
          <boxGeometry args={[28.6, 0.65, 20.6]} />
          <meshStandardMaterial color="#A63A32" roughness={0.5} />
        </mesh>

        {/* Inspection Canopy Cantilever (Ivory Composite #E8E2D2) */}
        <mesh position={[0, 4.0, -12]} castShadow>
          <boxGeometry args={[26, 0.35, 6.5]} />
          <meshStandardMaterial color="#E8E2D2" roughness={0.85} />
        </mesh>

        {/* Physical Mechanical Interlocking Safety Gates */}
        <mesh position={[-12, 1.9, -12]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 3.8, 8]} />
          <meshStandardMaterial color="#161619" metalness={0.8} />
        </mesh>
        <mesh position={[12, 1.9, -12]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 3.8, 8]} />
          <meshStandardMaterial color="#161619" metalness={0.8} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* 6. MEMORY FIELD (Smoked Monolithic Slabs at x = 0, z = 120)         */}
      {/* ================================================================= */}
      <group
        position={[0, 0, 120]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("MEMORY_ARCHIVE");
          openDocket({
            type: "MISSION",
            id: "MEMORY_ARCHIVE",
            title: "Smoked Monolithic Memory Field",
            meta: {
              signage: "MEMORY FIELD [KEY 7]",
              storage: "Working Memory, Episodic History, Semantic Rules",
              isolation: "Tenant-Isolated SQLite Persistent Store",
            },
          });
        }}
      >
        {/* Recessed Foundation Basin */}
        <mesh position={[0, 0.15, 0]} receiveShadow>
          <boxGeometry args={[94, 0.3, 30]} />
          <meshStandardMaterial color="#121214" roughness={0.95} />
        </mesh>

        {/* 6 Smoked Monolithic Translucent Memory Slabs */}
        {[-38, -23, -8, 8, 23, 38].map((vx, i) => (
          <group key={`memory-slab-${i}`} position={[vx, 2.2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[11.5, 3.8, 24]} />
              <meshStandardMaterial
                color="#181820"
                roughness={0.2}
                metalness={0.3}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Machined Brushed Aluminium Cap */}
            <mesh position={[0, 1.95, 0]} castShadow>
              <boxGeometry args={[11.0, 0.15, 23]} />
              <meshStandardMaterial color="#8A888F" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Brass Index Identification Clip */}
            <mesh position={[5.6, 1.2, 0]} castShadow>
              <boxGeometry args={[0.2, 1.2, 4.0]} />
              <meshStandardMaterial color="#C5A059" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================================================================= */}
      {/* 7. OBSERVABILITY TELEMETRY TRANSCEIVER (at x = 180, z = -75)        */}
      {/* ================================================================= */}
      <group
        position={[180, 0, -75]}
        onClick={(e) => {
          e.stopPropagation();
          selectDistrict("OBSERVABILITY");
          openDocket({
            type: "MISSION",
            id: "OBSERVABILITY",
            title: "Observability Telemetry Transceiver",
            meta: {
              signage: "TELEMETRY [KEY 8]",
              telemetry: "Structured Event Bus, WebSocket Stream, OpenTelemetry Export",
              status: "STREAMING · 60 FPS",
            },
          });
        }}
      >
        {/* Stepped Base Pedestal */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.8, 3.5, 1.2, 8]} />
          <meshStandardMaterial color="#232328" roughness={0.7} />
        </mesh>

        {/* Vertical Waveguide Mast */}
        <mesh position={[0, 6.0, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.55, 10.0, 8]} />
          <meshStandardMaterial color="#8A888F" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Tiered Transceiver Disks */}
        {[3.5, 6.2, 8.8].map((py, i) => (
          <mesh key={`transceiver-disk-${i}`} position={[0, py, 0]} castShadow>
            <cylinderGeometry args={[1.8 - i * 0.4, 1.8 - i * 0.4, 0.22, 8]} />
            <meshStandardMaterial color="#161619" metalness={0.7} />
          </mesh>
        ))}

        {/* Parabolic Waveguide Dish (Fixed resting angle) */}
        <group position={[0, 11.2, 0]} rotation={[0.35, -0.2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[2.2, 0.4, 0.8, 16]} />
            <meshStandardMaterial color="#8A888F" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.6]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshBasicMaterial color="#C5A059" />
          </mesh>
        </group>
      </group>
    </group>
  );
};
