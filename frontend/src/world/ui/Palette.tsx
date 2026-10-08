"use client";

import React, { useEffect, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { DISTRICTS } from "../layout/districts";
import { DistrictId } from "../adapter/types";

export const Palette: React.FC = () => {
  const { isSearchPaletteOpen, toggleSearchPalette, selectDistrict, closeMissionSheet } = useWorldStore();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleSearchPalette();
      } else if (e.key === "Escape") {
        if (isSearchPaletteOpen) {
          toggleSearchPalette(false);
        } else {
          closeMissionSheet();
        }
      } else if (!isSearchPaletteOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Quick numbers 1..8 jump to districts
        const districtKeys: Record<string, DistrictId> = {
          "1": "CONTROL",
          "2": "MISSIONS_YARD",
          "3": "PLANNING_GANTRY",
          "4": "AGENT_DEPOT",
          "5": "TOOL_WORKSHOP",
          "6": "FAILURE_HOUSE",
          "7": "MEMORY_ARCHIVE",
          "8": "OBSERVABILITY",
        };
        if (districtKeys[e.key]) {
          selectDistrict(districtKeys[e.key]);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchPaletteOpen, toggleSearchPalette, selectDistrict, closeMissionSheet]);

  if (!isSearchPaletteOpen) return null;

  const districtList = Object.values(DISTRICTS).filter(
    (d) =>
      d.label.toLowerCase().includes(filter.toLowerCase()) ||
      d.signageName.toLowerCase().includes(filter.toLowerCase()) ||
      d.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-[#121214]/40 backdrop-blur-[2px]">
      <div className="w-[540px] max-w-[92vw] bg-[#EFE9DC] border border-[#121214] shadow-[0_20px_48px_rgba(18,18,20,0.24)] p-4 select-none">
        <div className="flex items-center justify-between border-b border-[#121214] pb-2 mb-3">
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#3A3A3C]">
            CONTROL TABLE JUMP PALETTE · [ESC: CLOSE]
          </span>
          <span className="text-[10px] font-mono text-[#A8A69E]">
            KEYS 1–8 DIRECT JUMP
          </span>
        </div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search districts, stations, entities..."
          autoFocus
          className="w-full px-3 py-2 bg-[#E4DCCB] border border-[#121214] text-xs font-mono text-[#121214] placeholder-[#3A3A3C]/60 focus:outline-none focus:ring-1 focus:ring-[#C98A2B] mb-3"
        />

        <div className="space-y-1 max-h-[320px] overflow-y-auto">
          {districtList.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                selectDistrict(d.id);
                toggleSearchPalette(false);
              }}
              className="w-full text-left p-2 hover:bg-[#E4DCCB] flex items-center justify-between border border-transparent hover:border-[#121214] transition-all"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#121214]">{d.label}</span>
                  <span className="text-[9px] font-mono bg-[#232325] text-[#E4DCCB] px-1 py-0.2">
                    KEY {d.shortcutKey}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#3A3A3C] mt-0.5">{d.description}</div>
              </div>
              <span className="text-[10px] font-mono text-[#C98A2B] uppercase font-semibold">
                FLY →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
