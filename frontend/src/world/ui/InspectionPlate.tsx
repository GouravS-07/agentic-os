"use client";

import React from "react";
import { useWorldStore } from "../state/worldStore";

/**
 * Inspection Plate (Milestone M4.5 Restrained Engineering Marginalia)
 * Subtle technical label integrated into the physical world corner.
 */
export const InspectionPlate: React.FC = () => {
  const { qualityTier, setQualityTier } = useWorldStore();

  return (
    <div className="fixed top-5 left-6 z-30 select-none pointer-events-auto">
      <div className="bg-[#EFE9DC]/85 backdrop-blur-[2px] border border-[#3A3A3C]/30 px-3 py-1.5 flex items-center gap-3">
        <div>
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-[#6E6B65] block">
            AGENTIC OS · INTERLOCKING
          </span>
          <span className="text-[10px] font-bold tracking-wider text-[#121214] block">
            CONTROL TABLE · 1:1
          </span>
        </div>

        <div className="h-4 w-px bg-[#3A3A3C]/20" />

        {/* Quality selector */}
        <div className="flex items-center gap-1 font-mono text-[8px]">
          {(["HIGH", "LOW", "DIAGRAM"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setQualityTier(tier)}
              className={`px-1.5 py-0.5 uppercase transition-colors ${
                qualityTier === tier
                  ? "bg-[#121214] text-[#EFE9DC] font-bold"
                  : "text-[#6E6B65] hover:bg-[#E4DCCB]"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#3A3A3C]/20" />

        {/* Return to Legacy 2D mode */}
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("world");
              url.searchParams.set("legacy", "1");
              window.location.href = url.pathname + url.search;
            }
          }}
          className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border border-[#3A3A3C]/30 text-[#3A3A3C] hover:bg-[#232325] hover:text-[#EFE9DC] transition-colors"
        >
          2D
        </button>
      </div>
    </div>
  );
};
