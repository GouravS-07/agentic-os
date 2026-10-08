"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSceneStore, CAMERA_PRESETS } from "../state/useSceneStore";
import { SpatialView } from "../types";

export function useCameraDirector() {
  const pathname = usePathname();
  const setSpatialView = useSceneStore((s) => s.setSpatialView);
  const selectEntity = useSceneStore((s) => s.selectEntity);

  useEffect(() => {
    // Determine spatial view based on active Next.js route
    if (pathname === "/") {
      setSpatialView("HOME");
      selectEntity(null);
    } else if (pathname === "/missions") {
      setSpatialView("MISSIONS");
      selectEntity(null);
    } else if (pathname.startsWith("/missions/")) {
      setSpatialView("MISSION_DETAIL");
    } else if (pathname.startsWith("/agents")) {
      setSpatialView("AGENTS");
    } else if (pathname === "/tasks") {
      setSpatialView("TASKS");
    } else {
      setSpatialView("OVERVIEW");
    }
  }, [pathname, setSpatialView, selectEntity]);
}
