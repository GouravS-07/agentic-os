"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { useSceneStore } from "../state/useSceneStore";
import { HomeScene } from "./HomeScene";
import { SceneBridge } from "../adapters/SceneBridge";

export const SceneRoot: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const is3DEnabled = useSceneStore((state) => state.is3DEnabled);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Do not render the background AI Core canvas on mission detail pages
  // to avoid visual competition with the spatial mission DAG workspace
  if (!mounted || !is3DEnabled || pathname?.startsWith("/missions")) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(14, 165, 233, 0.08) 0%, rgba(2, 6, 23, 0) 100%)",
      }}
    >
      {/* Real-time Domain Event & Telemetry Bridge */}
      <SceneBridge />

      {/* Persistent Three.js Canvas */}
      <Canvas
        camera={{
          position: [0, 4, 18],
          fov: 45,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        className="pointer-events-auto"
      >
        <HomeScene />
      </Canvas>
    </div>
  );
};
