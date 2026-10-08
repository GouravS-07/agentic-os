"use client";

import React from "react";
import type { LayoutStation } from "../layout/types.ts";
import { stationPlatePath } from "../layout/chamfer.ts";
import { SignalSemaphore } from "./SignalSemaphore.tsx";

interface StationPlateProps {
  station: LayoutStation;
  isSelected?: boolean;
  onSelect?: (stationId: string) => void;
}

/**
 * Interlocking Station Plate
 * Flat chamfered bone plate with state glyph, task title, agent badge, semaphore signal, and selection highlight.
 */
export const StationPlate: React.FC<StationPlateProps> = ({
  station,
  isSelected = false,
  onSelect,
}) => {
  const {
    id,
    title,
    status,
    agentType,
    x,
    y,
    width,
    height,
    isRecovery,
    attemptCount,
    failureCategory,
  } = station;

  const chamferPath = stationPlatePath(width, height, 5.0);

  // Plate background and outline styling based on state
  let plateFill = "#E4DCCB"; // Bone
  let strokeColor = "#121214"; // Ink
  let strokeWidth = isSelected ? 2.4 : 1.2;

  switch (status) {
    case "COMPLETED":
      plateFill = "#DDE6D3"; // Pale Clear
      strokeColor = "#232325";
      break;
    case "RUNNING":
      plateFill = "#EFE9DC"; // Ivory active
      strokeColor = "#C98A2B"; // Amber
      strokeWidth = 2.0;
      break;
    case "FAILED":
      plateFill = "#F4EBE8"; // Pale red tint
      strokeColor = "#A63A32"; // Danger red
      strokeWidth = 2.0;
      break;
    case "WAITING_APPROVAL":
      plateFill = "#F6F1E6"; // Pale amber tint
      strokeColor = "#C98A2B";
      strokeWidth = 2.0;
      break;
    case "BLOCKED":
      plateFill = "#DCD6C5";
      strokeColor = "#3A3A3C";
      break;
    case "READY":
      plateFill = "#E4DCCB";
      strokeColor = "#121214";
      break;
    case "PENDING":
    default:
      plateFill = "#EFE9DC";
      strokeColor = "#A8A69E";
      break;
  }

  // Format title into 1 or 2 lines
  let line1 = title;
  let line2 = "";
  if (title.length > 22) {
    const spaceIdx = title.lastIndexOf(" ", 22);
    if (spaceIdx > 8) {
      line1 = title.slice(0, spaceIdx);
      line2 = title.slice(spaceIdx + 1);
    }
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(id);
      }}
      className="cursor-pointer group select-none transition-transform duration-150"
    >
      {/* Paper Drop Shadow (Subtle offset #CFC6B2) */}
      <path
        d={chamferPath}
        transform="translate(2, 2.5)"
        fill="#CFC6B2"
        opacity="0.6"
      />

      {/* Main Bone Station Plate */}
      <path
        d={chamferPath}
        fill={plateFill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isRecovery ? "4 2" : undefined}
      />

      {/* Amber Active Corner Tab if RUNNING */}
      {status === "RUNNING" && (
        <polygon
          points={`0,5 5,0 16,0 0,16`}
          fill="#C98A2B"
        />
      )}

      {/* Danger Red Crossbar Header if FAILED */}
      {status === "FAILED" && (
        <line
          x1="0"
          y1="0"
          x2={width}
          y2="0"
          stroke="#A63A32"
          strokeWidth="4"
        />
      )}

      {/* State Glyph in Top-Right Corner (Shape Redundancy) */}
      <g transform={`translate(${width - 16}, 6)`}>
        {status === "COMPLETED" && (
          <g>
            <circle cx="5" cy="5" r="4.5" fill="#DDE6D3" stroke="#121214" strokeWidth="0.8" />
            <polyline points="2.5,5 4.5,7.5 7.5,3" fill="none" stroke="#121214" strokeWidth="1.2" />
          </g>
        )}
        {status === "RUNNING" && (
          <g className="animate-pulse">
            <rect x="1" y="1" width="8" height="8" fill="#C98A2B" stroke="#121214" strokeWidth="0.8" />
          </g>
        )}
        {status === "FAILED" && (
          <g>
            <circle cx="5" cy="5" r="4.5" fill="#A63A32" stroke="#121214" strokeWidth="0.8" />
            <line x1="3" y1="3" x2="7" y2="7" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="7" y1="3" x2="3" y2="7" stroke="#FFFFFF" strokeWidth="1.2" />
          </g>
        )}
        {status === "WAITING_APPROVAL" && (
          <g>
            <polygon points="5,1 9,3 9,6 5,9 1,6 1,3" fill="#C98A2B" stroke="#121214" strokeWidth="0.8" />
            <line x1="5" y1="3.5" x2="5" y2="6.5" stroke="#121214" strokeWidth="1" />
          </g>
        )}
        {status === "READY" && (
          <circle cx="5" cy="5" r="4" fill="none" stroke="#121214" strokeWidth="1" />
        )}
        {status === "PENDING" && (
          <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="#A8A69E" strokeWidth="0.8" strokeDasharray="2 2" />
        )}
        {status === "BLOCKED" && (
          <g>
            <line x1="1" y1="1" x2="9" y2="9" stroke="#3A3A3C" strokeWidth="1" />
            <line x1="1" y1="9" x2="9" y2="1" stroke="#3A3A3C" strokeWidth="1" />
          </g>
        )}
      </g>

      {/* Agent Tag / Indicator (Top-Left) */}
      <g transform="translate(10, 11)">
        <text
          x="0"
          y="0"
          fill="#3A3A3C"
          fontSize="7.5"
          fontWeight="700"
          fontFamily="var(--font-technical), monospace"
          letterSpacing="0.4"
        >
          {isRecovery ? `[RECOVERY · ${agentType || "AGENT"}]` : (agentType ? `[${agentType}]` : `[TASK]`)}
        </text>
      </g>

      {/* Task Title (Center Text) */}
      <g transform="translate(10, 24)">
        <text
          x="0"
          y="0"
          fill="#121214"
          fontSize="10"
          fontWeight="700"
          fontFamily="var(--font-signage), sans-serif"
          letterSpacing="0.2"
        >
          {line1}
        </text>
        {line2 && (
          <text
            x="0"
            y="11"
            fill="#121214"
            fontSize="9.5"
            fontWeight="600"
            fontFamily="var(--font-signage), sans-serif"
            opacity="0.85"
          >
            {line2}
          </text>
        )}
      </g>

      {/* Bottom Status Bar & Retry Ticks */}
      <g transform={`translate(10, ${height - 8})`}>
        <text
          x="0"
          y="0"
          fill={status === "FAILED" ? "#A63A32" : status === "RUNNING" ? "#C98A2B" : "#3A3A3C"}
          fontSize="7"
          fontWeight="700"
          fontFamily="var(--font-technical), monospace"
        >
          {status}
          {attemptCount > 0 ? ` · ATTEMPTS: ${attemptCount}` : ""}
        </text>

        {failureCategory && (
          <text
            x={width - 24}
            y="0"
            textAnchor="end"
            fill="#A63A32"
            fontSize="6.5"
            fontWeight="700"
            fontFamily="var(--font-technical), monospace"
          >
            [{failureCategory}]
          </text>
        )}
      </g>

      {/* Attached Entrance Semaphore Signal */}
      <SignalSemaphore
        x={-8}
        y={height / 2}
        status={status}
        isRecovery={isRecovery}
      />
    </g>
  );
};
