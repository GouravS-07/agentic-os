"use client";

import React, { useEffect } from "react";
import { useWebSocket } from "@/lib/useWebSocket";
import { SceneAdapter } from "./SceneAdapter";
import { useSceneStore } from "../state/useSceneStore";
import { useCameraDirector } from "../hooks/useCameraDirector";

export const SceneBridge: React.FC = () => {
  const is3DEnabled = useSceneStore((s) => s.is3DEnabled);
  useCameraDirector();

  useEffect(() => {
    if (!is3DEnabled) return;

    const fetchInitialData = async () => {
      try {
        const [mRes, tRes, aRes] = await Promise.all([
          fetch("/api/v1/missions"),
          fetch("/api/v1/tasks"),
          fetch("/api/v1/approvals?status=PENDING"),
        ]);
        const missions = mRes.ok ? await mRes.json() : [];
        const tasks = tRes.ok ? await tRes.json() : [];
        const approvals = aRes.ok ? await aRes.json() : [];

        SceneAdapter.syncHomeData(
          Array.isArray(missions) ? missions : missions.items || [],
          Array.isArray(tasks) ? tasks : tasks.items || [],
          Array.isArray(approvals) ? approvals : approvals.items || [],
          []
        );
      } catch (err) {
        console.error("SceneBridge initial sync failed:", err);
      }
    };

    fetchInitialData();
  }, [is3DEnabled]);

  useWebSocket({
    channel: "system",
    onEvent: (event) => {
      if (is3DEnabled) {
        SceneAdapter.handleLiveEvent(event);
      }
    },
  });

  return null;
};
