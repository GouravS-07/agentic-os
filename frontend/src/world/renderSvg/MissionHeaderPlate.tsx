"use client";

import React from "react";

interface MissionHeaderPlateProps {
  title: string;
  description?: string;
  status: string;
  planVersion: number;
  replanCount: number;
  width?: number;
}

/**
 * Head Plate for Mission Sheet
 * Displays the mission goal, split-flap Plan badge (v1/v2), status, and replan count.
 */
export const MissionHeaderPlate: React.FC<MissionHeaderPlateProps> = ({
  title,
  description,
  status,
  planVersion,
  replanCount,
  width = 800,
}) => {
  return (
    <div className="w-full bg-[#EFE9DC] border-b border-[#121214] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
      {/* Goal / Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#3A3A3C] bg-[#E4DCCB] px-1.5 py-0.5 border border-[#121214]/30">
            GOAL · MISSION SHEET
          </span>
          {replanCount > 0 && (
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#C98A2B] bg-[#EFE9DC] px-1.5 py-0.5 border border-[#C98A2B]">
              REPLANS: {replanCount}
            </span>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-black text-[#121214] tracking-tight font-serif truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-[#3A3A3C] line-clamp-1 mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Badges & Status Indicators */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Split-Flap Plan Version Badge */}
        <div className="flex items-center border border-[#121214] bg-[#232325] text-[#EFE9DC] px-2.5 py-1 text-xs font-mono font-bold">
          <span className="text-[#A8A69E] mr-1 text-[10px]">PLAN</span>
          <span className="text-[#EFE9DC] tracking-wider">v{planVersion}</span>
        </div>

        {/* Mission Status Plate */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-mono font-bold tracking-wider ${
            status === "RUNNING"
              ? "bg-[#EFE9DC] border-[#C98A2B] text-[#C98A2B]"
              : status === "COMPLETED"
              ? "bg-[#DDE6D3] border-[#121214] text-[#121214]"
              : status === "FAILED"
              ? "bg-[#F4EBE8] border-[#A63A32] text-[#A63A32]"
              : "bg-[#E4DCCB] border-[#121214] text-[#3A3A3C]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-none ${
              status === "RUNNING"
                ? "bg-[#C98A2B] animate-pulse"
                : status === "COMPLETED"
                ? "bg-[#121214]"
                : status === "FAILED"
                ? "bg-[#A63A32]"
                : "bg-[#3A3A3C]"
            }`}
          />
          <span>{status}</span>
        </div>
      </div>
    </div>
  );
};
