"use client";

import React, { useEffect, useState } from "react";
import { fetchMissions } from "@/lib/api";
import { useWorldStore } from "../state/worldStore";

interface MissionSummary {
  id: string;
  title: string;
  status: string;
  plan_version?: number;
  progress: number;
}

/**
 * Departures Board (Milestone M4.5 Restrained Engineering Marginalia)
 */
export const DeparturesBoard: React.FC = () => {
  const [activeMission, setActiveMission] = useState<MissionSummary | null>(null);
  const { openMissionSheet } = useWorldStore();

  useEffect(() => {
    let mounted = true;
    async function loadRunningMission() {
      try {
        const mList = await fetchMissions();
        if (!mounted) return;
        const running = mList.find(
          (m) => m.status === "RUNNING" || m.status === "WAITING_APPROVAL" || m.status === "READY"
        ) || mList[0] || null;
        setActiveMission(running);
      } catch (err) {
        console.debug("Failed to load departures data:", err);
      }
    }
    loadRunningMission();
    const interval = setInterval(loadRunningMission, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!activeMission) return null;

  return (
    <div className="fixed top-5 right-6 z-30 select-none pointer-events-auto">
      <div
        onClick={() => openMissionSheet(activeMission.id)}
        className="bg-[#EFE9DC]/85 backdrop-blur-[2px] text-[#121214] border border-[#3A3A3C]/30 px-3 py-1.5 cursor-pointer hover:bg-[#E4DCCB] transition-colors max-w-[260px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#3A3A3C]/20 pb-1 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#C98A2B] inline-block" />
            <span className="text-[8px] tracking-[0.2em] font-mono text-[#6E6B65] uppercase">
              DEPARTURES · LIVE
            </span>
          </div>
          <span className="text-[8px] font-mono text-[#6E6B65]">
            v{activeMission.plan_version || 1}
          </span>
        </div>

        <div className="truncate text-[10px] font-bold tracking-tight text-[#121214]">
          {activeMission.title}
        </div>
      </div>
    </div>
  );
};
