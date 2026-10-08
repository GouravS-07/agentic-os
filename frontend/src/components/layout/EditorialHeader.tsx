"use client";

import React from "react";
import Link from "next/link";
import { Box } from "lucide-react";
import { useSceneStore } from "@/scene/state/useSceneStore";
import { cn } from "@/lib/utils";

export function EditorialHeader() {
  const { is3DEnabled, set3DEnabled } = useSceneStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-20 px-8 sm:px-14 flex items-center justify-between z-40 pointer-events-none select-none">
      {/* Top Left Wordmark */}
      <Link href="/" className="pointer-events-auto group flex items-center gap-2">
        <span className="font-mono text-xs tracking-[0.3em] font-semibold text-white/90 uppercase group-hover:text-white transition-colors">
          AGENTIC OS
        </span>
      </Link>

      {/* Top Right Discreet Status & 3D Feature Toggle */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase hidden sm:inline">
          AUTONOMOUS RUNTIME
        </span>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("world", "1");
              url.searchParams.delete("legacy");
              window.location.href = url.pathname + url.search;
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all backdrop-blur-xl border bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
        >
          <span className="w-1.5 h-1.5 rounded-none bg-amber-400 inline-block" />
          <span>INTERLOCKING WORLD</span>
        </button>

        <button
          type="button"
          onClick={() => set3DEnabled(!is3DEnabled)}
          title={is3DEnabled ? "Switch to 2D Mode" : "Switch to 3D Mode"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all backdrop-blur-xl border",
            is3DEnabled
              ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
              : "bg-black/40 text-zinc-400 border-white/[0.08] hover:text-white"
          )}
        >
          <Box className="w-3 h-3 text-cyan-400" />
          <span>{is3DEnabled ? "3D ON" : "3D OFF"}</span>
        </button>
      </div>
    </header>
  );
}
