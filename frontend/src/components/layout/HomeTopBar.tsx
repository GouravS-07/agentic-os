"use client";

import React from "react";
import Link from "next/link";
import { Box, Sparkles } from "lucide-react";
import { useSceneStore } from "@/scene/state/useSceneStore";
import { cn } from "@/lib/utils";

export function HomeTopBar() {
  const { is3DEnabled, set3DEnabled, telemetry } = useSceneStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-40 pointer-events-none select-none">
      {/* Top Left Wordmark */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="font-mono text-xs tracking-[0.25em] font-bold text-white uppercase group-hover:text-cyan-300 transition-colors">
            AGENTIC OS
          </span>
        </Link>
        <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase hidden sm:inline">
          // AUTONOMOUS RUNTIME v2.4
        </span>
      </div>

      {/* Top Right Technical Telemetry HUD */}
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* Core State Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/[0.08] backdrop-blur-xl text-[10px] font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="uppercase">CORE:</span>
          <span className="text-white font-semibold">{telemetry.coreState || "IDLE"}</span>
        </div>

        {/* Fleet Count */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/[0.08] backdrop-blur-xl text-[10px] font-mono text-zinc-400">
          <span>05 AGENTS ONLINE</span>
        </div>

        {/* 3D Feature Toggle */}
        <button
          type="button"
          onClick={() => set3DEnabled(!is3DEnabled)}
          title={is3DEnabled ? "Switch to 2D Dashboard" : "Switch to 3D Spatial Mode"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all backdrop-blur-xl border",
            is3DEnabled
              ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              : "bg-black/40 text-zinc-400 border-white/[0.08] hover:text-white"
          )}
        >
          <Box className={cn("w-3 h-3", is3DEnabled && "text-cyan-400 animate-pulse")} />
          <span>{is3DEnabled ? "3D ON" : "3D OFF"}</span>
        </button>
      </div>
    </header>
  );
}
