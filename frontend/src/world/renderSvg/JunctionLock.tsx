"use client";

import React from "react";
import type { LayoutLockPlate } from "../layout/types.ts";

interface JunctionLockProps {
  lockPlate: LayoutLockPlate;
}

/**
 * Mechanical Junction Lock Plate & Pins for Multi-Prerequisite Tasks.
 * - Each incoming dependency terminates at a physical lock pin slot.
 * - A pin is lowered (cleared) when its prerequisite completes.
 * - The master interlocking bar slides open ONLY when ALL pins are cleared.
 */
export const JunctionLock: React.FC<JunctionLockProps> = ({ lockPlate }) => {
  const { x, y, width, height, allSatisfied, pins } = lockPlate;

  return (
    <g transform={`translate(${x}, ${y})`} className="select-none pointer-events-none">
      {/* Brushed Metal Base Plate */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill="#A8A69E"
        stroke="#121214"
        strokeWidth="1"
      />

      {/* Mechanical Rivets / Fasteners */}
      <circle cx="3" cy="4" r="0.8" fill="#232325" />
      <circle cx={width - 3} cy="4" r="0.8" fill="#232325" />
      <circle cx="3" cy={height - 4} r="0.8" fill="#232325" />
      <circle cx={width - 3} cy={height - 4} r="0.8" fill="#232325" />

      {/* Individual Prerequisite Lock Pins */}
      {pins.map((pin, idx) => {
        const localPinY = pin.pinY - y;
        const isSatisfied = pin.isSatisfied;

        return (
          <g key={pin.sourceTaskId || idx} transform={`translate(0, ${localPinY})`}>
            {/* Pin Guide Slot */}
            <line x1="1" y1="0" x2={width - 1} y2="0" stroke="#3A3A3C" strokeWidth="1.2" />

            {/* Lock Pin Head */}
            {isSatisfied ? (
              // Lowered / Retracted Pin (Satisfied: Pale Clear #DDE6D3)
              <g transform={`translate(${width - 4}, 0)`}>
                <circle cx="0" cy="0" r="2.2" fill="#DDE6D3" stroke="#121214" strokeWidth="0.8" />
                <line x1="-1.2" y1="0" x2="1.2" y2="0" stroke="#121214" strokeWidth="0.6" />
              </g>
            ) : (
              // Raised / Blocking Pin (Unsatisfied: Charcoal #232325 with Amber warning)
              <g transform="translate(4, 0)">
                <rect x="-2" y="-3" width="4" height="6" fill="#232325" stroke="#121214" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="1.2" fill="#C98A2B" />
              </g>
            )}
          </g>
        );
      })}

      {/* Vertical Interlocking Master Bar */}
      {allSatisfied ? (
        // Bar slid open to top (Route cleared)
        <g transform={`translate(${width / 2}, 2)`}>
          <line x1="0" y1="0" x2="0" y2="8" stroke="#121214" strokeWidth="2.5" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#DDE6D3" strokeWidth="1.2" />
        </g>
      ) : (
        // Bar locked across full height (Route blocked)
        <g transform={`translate(${width / 2}, 0)`}>
          <line x1="0" y1="6" x2="0" y2={height - 6} stroke="#121214" strokeWidth="2.5" />
          <line x1="0" y1="6" x2="0" y2={height - 6} stroke="#A63A32" strokeWidth="1.2" />
        </g>
      )}
    </g>
  );
};
