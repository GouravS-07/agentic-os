"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { EditorialHeader } from "./EditorialHeader";
import { EditorialNav } from "./EditorialNav";
import { useSceneStore } from "@/scene/state/useSceneStore";
import { evaluateWorldMode } from "@/world/config";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const is3DEnabled = useSceneStore((s) => s.is3DEnabled);
  const [mounted, setMounted] = useState(false);
  const [isWorld, setIsWorld] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsWorld(evaluateWorldMode());
  }, []);

  // Interlocking World Mode on Home route takes over entire viewport
  if (mounted && pathname === "/" && isWorld) {
    return <>{children}</>;
  }

  const isHome3D = mounted && pathname === "/" && is3DEnabled;

  if (isHome3D) {
    return (
      <div className="relative w-screen h-screen overflow-hidden select-none">
        {/* Minimalist Editorial Header */}
        <EditorialHeader />

        {/* Full Viewport Spatial Scroll Content */}
        <main className="w-full h-full overflow-y-auto overflow-x-hidden relative z-10 scroll-smooth">
          {children}
        </main>

        {/* Minimalist Editorial Navigation Dock */}
        <EditorialNav />
      </div>
    );
  }

  // Standard Dashboard Layout for Inner Routes or 2D Mode
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
