"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "../tokens.css";
import { useWorldStore } from "../state/worldStore";
import { InspectionPlate } from "./InspectionPlate";
import { DeparturesBoard } from "./DeparturesBoard";
import { Locator } from "./Locator";
import { Docket } from "./Docket";
import { Palette } from "./Palette";
import { Diagram } from "../renderSvg/Diagram";

// Lazy load 3D canvas with SSR disabled
const WorldCanvas = dynamic(
  () => import("../render3d/WorldCanvas").then((mod) => mod.WorldCanvas),
  { ssr: false }
);

export const WorldShell: React.FC = () => {
  const { qualityTier, setWorldActive } = useWorldStore();
  const [is3DReady, setIs3DReady] = useState(false);

  useEffect(() => {
    setWorldActive(true);
    const timer = setTimeout(() => setIs3DReady(true), 120);
    return () => clearTimeout(timer);
  }, [setWorldActive]);

  return (
    <main className="world w-screen h-screen overflow-hidden relative select-none">
      {/* HUD & Technical Overlays */}
      <InspectionPlate />
      <DeparturesBoard />
      <Locator />
      <Docket />
      <Palette />

      {/* Render Layer (3D Canvas or 2D Diagram fallback) */}
      <div className="w-full h-full absolute inset-0 z-10 transition-opacity duration-300">
        {qualityTier === "DIAGRAM" ? (
          <Diagram />
        ) : (
          <div className="w-full h-full">
            {/* Paint-first instant diagram before WebGL mount */}
            {!is3DReady && (
              <div className="absolute inset-0 z-0 opacity-80">
                <Diagram />
              </div>
            )}
            <WorldCanvas />
          </div>
        )}
      </div>

      {/* Cartouche Brand Stamp (Bottom Center) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-40">
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#3A3A3C]">
          AUTONOMOUS RAILWAY INTERLOCKING · SCALE 1:1
        </span>
      </div>
    </main>
  );
};
