"use client";

import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useWorldStore } from "../state/worldStore";
import { reconcileMission } from "../adapter/reconcile";
import { Lighting } from "./Lighting";
import { CameraRig } from "./CameraRig";
import { BoardSurface } from "./board/BoardSurface";
import { PrintedTypography } from "./board/PrintedTypography";
import { Districts } from "./board/Districts";
import { MissionsYard } from "./mission/MissionsYard";
import { MissionSheet3D } from "./mission/MissionSheet3D";

/**
 * Main 3D Interlocking Control Board Canvas
 * Single persistent Canvas rendering the architectural control table, districts, missions yard, and mission sheet DAGs.
 */
export const WorldCanvas: React.FC = () => {
  const { qualityTier, syncSceneModel, sceneModel, activeMissionId } = useWorldStore();
  const dpr = qualityTier === "HIGH" ? 1.5 : 1.0;

  // Hydrate initial real backend missions and tasks into the SceneModel
  useEffect(() => {
    fetch("/api/v1/missions")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then(async (data) => {
        const missions = Array.isArray(data) ? data : data.items || [];
        let updatedModel = { ...sceneModel };

        for (const m of missions) {
          try {
            const tRes = await fetch(`/api/v1/missions/${m.id}/tasks`);
            if (tRes.ok) {
              const tasks = await tRes.json();
              const taskList = Array.isArray(tasks) ? tasks : tasks.items || [];
              updatedModel = reconcileMission(updatedModel, m, taskList);
            }
          } catch (e) {
            console.warn(`Failed to fetch tasks for mission ${m.id}:`, e);
          }
        }

        syncSceneModel(updatedModel);
      })
      .catch((err) => {
        console.error("Failed to load missions for 3D world:", err);
      });
  }, []);

  return (
    <div className="w-full h-full relative bg-[#131316] select-none">
      <Canvas
        frameloop="demand"
        dpr={dpr}
        shadows={qualityTier === "HIGH"}
        camera={{
          fov: 22,
          position: [0, 95, 60],
          near: 0.5,
          far: 1200,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        {/* 1. Architectural Studio Lighting */}
        <Lighting />

        {/* 2. Low FOV Near-Axonometric Camera Rig */}
        <CameraRig />

        {/* 3. Physical Table Surface & Main Line Rails */}
        <BoardSurface />

        {/* 4. Physically Printed Typography beneath rails */}
        <PrintedTypography />

        {/* 5. 8 District Structures & Interactive Waypoints */}
        <Districts />

        {/* 6. Missions Yard Sidings & Mission Plaques */}
        <MissionsYard />

        {/* 7. Active Mission 3D Sheet & DAG Graph */}
        <MissionSheet3D />
      </Canvas>
    </div>
  );
};
