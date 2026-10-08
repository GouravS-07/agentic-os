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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
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

  // Standard Agentic OS Command Center Layout
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
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
