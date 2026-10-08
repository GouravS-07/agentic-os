"use client";

import React from "react";
import { useWorldStore } from "../state/worldStore";

/**
 * Locator (Milestone M4.5 Restrained Engineering Marginalia)
 */
export const Locator: React.FC = () => {
  const { locatorText, zoomLevel, closeMissionSheet } = useWorldStore();

  return (
    <div className="fixed bottom-5 left-6 z-30 select-none pointer-events-auto">
      <div className="flex items-center gap-2 px-2.5 py-1 bg-[#EFE9DC]/85 backdrop-blur-[2px] border border-[#3A3A3C]/30 text-[#121214]">
        <span className="w-1.5 h-1.5 bg-[#C98A2B] inline-block" />
        <span className="text-[9px] tracking-[0.14em] uppercase font-mono text-[#6E6B65]">
          LOC:
        </span>
        <span className="text-[10px] font-bold tracking-wider text-[#121214] uppercase">
          {locatorText}
        </span>
        {zoomLevel !== "BOARD" && (
          <button
            onClick={closeMissionSheet}
            className="ml-2 px-1 py-0.5 text-[8px] uppercase font-mono tracking-wider border border-[#3A3A3C]/30 text-[#3A3A3C] hover:bg-[#232325] hover:text-[#EFE9DC] transition-colors"
          >
            ESC: BOARD
          </button>
        )}
      </div>
    </div>
  );
};
