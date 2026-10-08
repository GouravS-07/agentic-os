"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Precision Computational Machine Chassis (Interlocking World Base)
 * Multi-tiered architectural base with recessed modular bays, structural cross-ribs,
 * milled conduit trenches, machined aluminium perimeter bezels, mounting stanchions,
 * and high-contrast material layering.
 */
export const BoardSurface: React.FC = () => {
  // Generate conduit retention clips along main spine (-240 to +240)
  const spineClips = useMemo(() => {
    const clips: number[] = [];
    for (let x = -240; x <= 240; x += 3.0) {
      clips.push(x);
    }
    return clips;
  }, []);

  // Generate clips along return loop (-160 to +160)
  const loopClips = useMemo(() => {
    const clips: number[] = [];
    for (let x = -160; x <= 160; x += 3.0) {
      clips.push(x);
    }
    return clips;
  }, []);

  // Structural chassis ribs along X axis
  const chassisRibsX = [-200, -140, -80, -20, 40, 100, 160, 220];
  
  // Outer perimeter hex bolts
  const perimeterBolts = useMemo(() => {
    const bolts: [number, number][] = [];
    for (let x = -250; x <= 250; x += 50) {
      bolts.push([x, -165]);
      bolts.push([x, 165]);
    }
    for (let z = -140; z <= 140; z += 40) {
      bolts.push([-256, z]);
      bolts.push([256, z]);
    }
    return bolts;
  }, []);

  return (
    <group name="machine-chassis-surface">
      {/* 1. Sub-Chassis Foundation Plinth (Deep Blackened Metal #121214) */}
      <mesh position={[0, -0.8, 0]} receiveShadow>
        <boxGeometry args={[530, 1.2, 350]} />
        <meshStandardMaterial color="#101012" roughness={0.9} metalness={0.2} />
      </mesh>

      {/* 2. Main Machine Upper Bed Plate (Dark Graphite #1C1C20) */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[520, 0.4, 340]} />
        <meshStandardMaterial color="#1C1C20" roughness={0.78} metalness={0.25} />
      </mesh>

      {/* 3. Outer Machined Aluminium Bezel Perimeter (#7A787F) */}
      {/* North / South Bezel Rails */}
      <mesh position={[0, 0.25, -168]} castShadow receiveShadow>
        <boxGeometry args={[524, 0.7, 4.0]} />
        <meshStandardMaterial color="#7A787F" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 168]} castShadow receiveShadow>
        <boxGeometry args={[524, 0.7, 4.0]} />
        <meshStandardMaterial color="#7A787F" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* West / East Bezel Rails */}
      <mesh position={[-258, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.7, 340]} />
        <meshStandardMaterial color="#7A787F" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[258, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 0.7, 340]} />
        <meshStandardMaterial color="#7A787F" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Perimeter Machined Hex Fasteners */}
      {perimeterBolts.map(([bx, bz], i) => (
        <group key={`pbolt-${i}`} position={[bx, 0.62, bz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.12, 6]} />
            <meshStandardMaterial color="#B0AEA8" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.04, 6]} />
            <meshBasicMaterial color="#121214" />
          </mesh>
        </group>
      ))}

      {/* 4. Structural Modular Recesses & Equipment Wells (Recessed Bays) */}
      {/* Staging Field Well (West) */}
      <mesh position={[-140, 0.02, 0]} receiveShadow>
        <boxGeometry args={[106, 0.12, 80]} />
        <meshStandardMaterial color="#141417" roughness={0.9} />
      </mesh>
      {/* Agent Staging Bay Well (South West) */}
      <mesh position={[-30, 0.02, 60]} receiveShadow>
        <boxGeometry args={[58, 0.12, 36]} />
        <meshStandardMaterial color="#141417" roughness={0.9} />
      </mesh>
      {/* Tool Matrix Well (East) */}
      <mesh position={[80, 0.02, -10]} receiveShadow>
        <boxGeometry args={[52, 0.12, 40]} />
        <meshStandardMaterial color="#141417" roughness={0.9} />
      </mesh>
      {/* Memory Vault Well (South) */}
      <mesh position={[0, 0.02, 120]} receiveShadow>
        <boxGeometry args={[96, 0.12, 34]} />
        <meshStandardMaterial color="#141417" roughness={0.9} />
      </mesh>

      {/* 5. Structural Transverse Ribs & Floor Grates */}
      {chassisRibsX.map((rx, i) => (
        <mesh key={`rib-${i}`} position={[rx, 0.06, 0]}>
          <boxGeometry args={[0.5, 0.12, 330]} />
          <meshStandardMaterial color="#2B2B32" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}

      {/* Longitudinal Divider Ribs */}
      {[-80, 40].map((rz, i) => (
        <mesh key={`lrib-${i}`} position={[0, 0.06, rz]}>
          <boxGeometry args={[510, 0.12, 0.5]} />
          <meshStandardMaterial color="#2B2B32" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}

      {/* 6. MAIN HIGH-SPEED DATA CONDUIT SPINE (West to East at z = 0) */}
      {/* Recessed Trench Bed */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[490, 0.16, 6.2]} />
        <meshStandardMaterial color="#111113" roughness={0.95} />
      </mesh>
      {/* Flanking Steel Guide Rails */}
      <mesh position={[0, 0.14, -3.0]} castShadow receiveShadow>
        <boxGeometry args={[490, 0.18, 0.4]} />
        <meshStandardMaterial color="#4A4A54" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.14, 3.0]} castShadow receiveShadow>
        <boxGeometry args={[490, 0.18, 0.4]} />
        <meshStandardMaterial color="#4A4A54" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Conduit Retention Clips */}
      {spineClips.map((cx, i) => (
        <mesh key={`sclip-${i}`} position={[cx, 0.12, 0]}>
          <boxGeometry args={[0.35, 0.08, 5.2]} />
          <meshStandardMaterial color="#2A2A30" roughness={0.7} />
        </mesh>
      ))}

      {/* Dual Hairline Conductive Bus Rails (#A8A69E / Machined Steel) */}
      <mesh position={[0, 0.16, -1.3]} castShadow>
        <boxGeometry args={[490, 0.1, 0.28]} />
        <meshStandardMaterial color="#A8A69E" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.16, 1.3]} castShadow>
        <boxGeometry args={[490, 0.1, 0.28]} />
        <meshStandardMaterial color="#A8A69E" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 7. REPLANNING & REMEDIATION RETURN CONDUIT LOOP (South z = 70) */}
      <mesh position={[0, 0.02, 70]} receiveShadow>
        <boxGeometry args={[340, 0.16, 5.0]} />
        <meshStandardMaterial color="#111113" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.14, 67.6]} castShadow receiveShadow>
        <boxGeometry args={[340, 0.18, 0.35]} />
        <meshStandardMaterial color="#4A4A54" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.14, 72.4]} castShadow receiveShadow>
        <boxGeometry args={[340, 0.18, 0.35]} />
        <meshStandardMaterial color="#4A4A54" roughness={0.4} metalness={0.7} />
      </mesh>
      {loopClips.map((cx, i) => (
        <mesh key={`lclip-${i}`} position={[cx, 0.12, 70]}>
          <boxGeometry args={[0.35, 0.08, 4.2]} />
          <meshStandardMaterial color="#2A2A30" />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 69.0]} castShadow>
        <boxGeometry args={[340, 0.1, 0.25]} />
        <meshStandardMaterial color="#A8A69E" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.16, 71.0]} castShadow>
        <boxGeometry args={[340, 0.1, 0.25]} />
        <meshStandardMaterial color="#A8A69E" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 45° Machined Cross-Conduits Linking Districts */}
      {/* To Carrier Staging Bay */}
      <group position={[-50, 0.1, 30]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[44, 0.14, 2.2]} />
          <meshStandardMaterial color="#111113" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[44, 0.06, 0.25]} />
          <meshStandardMaterial color="#A8A69E" metalness={0.8} />
        </mesh>
      </group>
      {/* To Fault Isolation Unit */}
      <group position={[60, 0.1, 35]} rotation={[0, Math.PI / 4, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[52, 0.14, 2.2]} />
          <meshStandardMaterial color="#111113" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[52, 0.06, 0.25]} />
          <meshStandardMaterial color="#A8A69E" metalness={0.8} />
        </mesh>
      </group>

      {/* 8. NORTH TELEMETRY & EVENT BUS CONDUIT (z = -80) */}
      <mesh position={[0, 0.05, -80]} receiveShadow>
        <boxGeometry args={[480, 0.1, 2.0]} />
        <meshStandardMaterial color="#141417" />
      </mesh>
      <mesh position={[0, 0.11, -80]} castShadow>
        <boxGeometry args={[480, 0.06, 0.3]} />
        <meshStandardMaterial color="#60606B" metalness={0.6} />
      </mesh>

      {/* 9. SUB-FLOOR MECHANICAL GRILLES & INTERNAL CAVITIES (Depth Windows) */}
      {[-160, -80, 80, 160].map((gx, gi) => (
        <group key={`subfloor-grille-${gi}`} position={[gx, 0.01, -45]}>
          {/* Recessed cavity box */}
          <mesh receiveShadow position={[0, -0.4, 0]}>
            <boxGeometry args={[26, 0.7, 18]} />
            <meshStandardMaterial color="#0A0A0C" roughness={0.95} />
          </mesh>
          {/* Internal Brass Drive Shaft & Counterweight in Cavity */}
          <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 24, 12]} />
            <meshStandardMaterial color="#C5A059" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[-6, -0.3, 0]} castShadow>
            <cylinderGeometry args={[2.2, 2.2, 0.8, 16]} />
            <meshStandardMaterial color="#3A3942" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[6, -0.3, 0]} castShadow>
            <cylinderGeometry args={[2.2, 2.2, 0.8, 16]} />
            <meshStandardMaterial color="#3A3942" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Slotted Cast Iron Grille Slits */}
          {[-7, -4.2, -1.4, 1.4, 4.2, 7].map((gz, gzi) => (
            <mesh key={`gslit-${gzi}`} position={[0, 0.04, gz]} castShadow>
              <boxGeometry args={[24, 0.08, 0.6]} />
              <meshStandardMaterial color="#2B2B33" metalness={0.65} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 10. OVERHEAD TRANSVERSE GANTRY TRUSSES (Foreground & Framing Occlusion) */}
      {/* West Portal Frame over Missions Siding Entry */}
      <group position={[-195, 0, 0]}>
        {/* North Support Pier */}
        <mesh position={[0, 5.5, -48]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 11.0, 4.2]} />
          <meshStandardMaterial color="#222228" roughness={0.65} metalness={0.5} />
        </mesh>
        {/* South Support Pier */}
        <mesh position={[0, 5.5, 48]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 11.0, 4.2]} />
          <meshStandardMaterial color="#222228" roughness={0.65} metalness={0.5} />
        </mesh>
        {/* Overhead Transverse Beam */}
        <mesh position={[0, 11.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 1.8, 100]} />
          <meshStandardMaterial color="#2E2E36" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Aluminium Cable Conduit Raceway along Beam */}
        <mesh position={[1.8, 11.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.8, 96]} />
          <meshStandardMaterial color="#8E8C96" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* East Transverse Gantry over Tool & Remediation Yard */}
      <group position={[175, 0, 0]}>
        {/* North Support Pier */}
        <mesh position={[0, 5.5, -50]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 11.0, 4.2]} />
          <meshStandardMaterial color="#222228" roughness={0.65} metalness={0.5} />
        </mesh>
        {/* South Support Pier */}
        <mesh position={[0, 5.5, 50]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 11.0, 4.2]} />
          <meshStandardMaterial color="#222228" roughness={0.65} metalness={0.5} />
        </mesh>
        {/* Overhead Transverse Beam */}
        <mesh position={[0, 11.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 1.8, 104]} />
          <meshStandardMaterial color="#2E2E36" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* High Voltage Bus Duct */}
        <mesh position={[-1.8, 11.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.8, 100]} />
          <meshStandardMaterial color="#8E8C96" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};
