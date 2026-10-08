"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { useWorldStore } from "../../state/worldStore";

function createMissionPlaqueTexture(
  title: string,
  status: string,
  planVersion: number = 1
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.Texture() as unknown as THREE.CanvasTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Monospace Plan Version & Status Tag
    ctx.fillStyle = "#6E6D78";
    ctx.font = `bold 28px "IBM Plex Mono", monospace`;
    ctx.fillText(`PLAN v${planVersion} // STATUS: ${status}`, 40, 62);

    // Mission Title
    ctx.fillStyle = "#121214";
    ctx.font = `bold 42px "Archivo", "Barlow Condensed", sans-serif`;
    ctx.fillText(title.length > 28 ? title.slice(0, 26) + "..." : title, 40, 145);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 3D Computational Staging Field (Missions Yard)
 * Displays parallel staging conduit bays with recessed channels, guide rails,
 * precision end buffers, and compact brushed composite mission plaques.
 */
export const MissionsYard: React.FC = () => {
  const { sceneModel, activeMissionId, openMissionSheet } = useWorldStore();
  const missionsList = Object.values(sceneModel.missions);

  return (
    <group position={[-140, 0.1, 0]} name="computational-staging-yard">
      {/* Staging Field Foundation Plinth (Dark Graphite #141416) */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[104, 0.2, 74]} />
        <meshStandardMaterial color="#141416" roughness={0.9} />
      </mesh>

      {/* Machined Outer Aluminium Curb (#7A787F) */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[104.6, 0.2, 74.6]} />
        <meshStandardMaterial color="#7A787F" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Staging Conduit Bays, End Buffers & Mission Plaques */}
      {missionsList.slice(0, 5).map((m, idx) => {
        const sidingZ = (idx - 2) * 13;
        const isRunning = m.status === "RUNNING";
        const isSelected = activeMissionId === m.id;

        return (
          <group key={m.id} position={[0, 0.1, sidingZ]}>
            {/* Recessed Conduit Channel */}
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[86, 0.12, 3.8]} />
              <meshStandardMaterial color="#1C1C20" roughness={0.85} />
            </mesh>

            {/* Retention Clips */}
            {[-36, -28, -20, -12, -4, 4, 12, 20, 28, 36].map((tx, ti) => (
              <mesh key={`st-${ti}`} position={[tx, 0.16, 0]}>
                <boxGeometry args={[0.35, 0.06, 3.2]} />
                <meshBasicMaterial color="#2B2B32" />
              </mesh>
            ))}

            {/* Dual Hairline Conductive Rails */}
            <mesh position={[0, 0.18, -0.9]} castShadow>
              <boxGeometry args={[86, 0.06, 0.26]} />
              <meshStandardMaterial color={isRunning ? "#C98A2B" : "#A8A69E"} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.18, 0.9]} castShadow>
              <boxGeometry args={[86, 0.06, 0.26]} />
              <meshStandardMaterial color={isRunning ? "#C98A2B" : "#A8A69E"} metalness={0.8} />
            </mesh>

            {/* West End Heavy Machined Buffer Stop Block */}
            <group position={[-43, 0.6, 0]}>
              <mesh castShadow>
                <boxGeometry args={[2.5, 1.2, 3.4]} />
                <meshStandardMaterial color="#232328" roughness={0.65} metalness={0.45} />
              </mesh>
              {/* Brass Buffer Contact Strips */}
              <mesh position={[1.3, 0, 0]}>
                <boxGeometry args={[0.2, 0.8, 2.8]} />
                <meshStandardMaterial color={isRunning ? "#C98A2B" : "#C5A059"} metalness={0.9} roughness={0.2} />
              </mesh>
            </group>

            {/* Mission Plaque Instrument Box */}
            <group
              position={[-10, 0.35, 0]}
              onClick={(e) => {
                e.stopPropagation();
                openMissionSheet(m.id);
              }}
            >
              {/* Plaque Dark Metal Base */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[28, 0.45, 8.0]} />
                <meshStandardMaterial
                  color="#1C1C20"
                  roughness={0.65}
                  metalness={0.4}
                />
              </mesh>

              {/* Plaque Machined Bezel Frame */}
              <mesh position={[0, 0.22, 0]} castShadow>
                <boxGeometry args={[28.4, 0.08, 8.4]} />
                <meshStandardMaterial color="#7A787F" metalness={0.8} roughness={0.25} />
              </mesh>

              {/* Plaque Top Ivory Composite Plate */}
              <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
                <boxGeometry args={[27.0, 0.12, 7.0]} />
                <meshStandardMaterial
                  color={isSelected ? "#F4EFE6" : "#E8E2D2"}
                  roughness={0.85}
                />
              </mesh>

              {/* Status Accent Tab */}
              <mesh position={[-13.6, 0.2, 0]}>
                <boxGeometry args={[0.5, 0.35, 6.8]} />
                <meshBasicMaterial color={isRunning ? "#C98A2B" : isSelected ? "#121214" : "#6E6B75"} />
              </mesh>

              {/* Plaque Printed Label */}
              <PlaqueLabel
                title={m.title}
                status={m.status}
                planVersion={m.planVersion}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
};

const PlaqueLabel: React.FC<{ title: string; status: string; planVersion: number }> = ({
  title,
  status,
  planVersion,
}) => {
  const texture = useMemo(
    () => createMissionPlaqueTexture(title, status, planVersion),
    [title, status, planVersion]
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.34, 0]}>
      <planeGeometry args={[25.5, 6.5]} />
      <meshBasicMaterial map={texture} transparent opacity={0.95} />
    </mesh>
  );
};
