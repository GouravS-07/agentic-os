"use client";

import React from "react";
import type { BackendTaskStatus } from "../adapter/types.ts";

interface SignalSemaphoreProps {
  x: number;
  y: number;
  status: BackendTaskStatus;
  isRecovery?: boolean;
}

/**
 * Mechanical Semaphore Signal Post & Lamp
 * - Arm 0° horizontal: STOP / Hazard / Pending / Waiting Approval
 * - Arm 45° downward: CLEAR / Proceed / Running / Completed
 * - State never relies on color alone: physical arm angle + lamp tone + state glyph
 */
export const SignalSemaphore: React.FC<SignalSemaphoreProps> = ({
  x,
  y,
  status,
  isRecovery = false,
}) => {
  // Determine arm angle & lamp color
  let armAngle = 0; // 0 = horizontal (danger/held/pending)
  let lampColor = "#3A3A3C"; // Dark inert
  let isLampGlowing = false;

  switch (status) {
    case "READY":
      armAngle = 45;
      lampColor = "#DDE6D3"; // Pale clear
      break;
    case "RUNNING":
      armAngle = 45;
      lampColor = "#C98A2B"; // Amber
      isLampGlowing = true;
      break;
    case "WAITING_APPROVAL":
      armAngle = 0; // Held horizontal
      lampColor = "#C98A2B"; // Amber steady
      break;
    case "COMPLETED":
      armAngle = 45;
      lampColor = "#DDE6D3"; // Pale clear
      break;
    case "FAILED":
      armAngle = 0;
      lampColor = "#A63A32"; // Red
      break;
    case "BLOCKED":
      armAngle = 0;
      lampColor = "#A63A32"; // Red
      break;
    case "PENDING":
    default:
      armAngle = 0;
      lampColor = "#3A3A3C"; // Dark
      break;
  }

  return (
    <g transform={`translate(${x}, ${y})`} className="select-none">
      {/* Signal Post (Charcoal structure) */}
      <line x1="0" y1="12" x2="0" y2="-10" stroke="#232325" strokeWidth="1.6" />
      <line x1="-3" y1="12" x2="3" y2="12" stroke="#232325" strokeWidth="1.2" />

      {/* Lamp Housing */}
      <circle cx="0" cy="-6" r="3" fill="#232325" stroke="#121214" strokeWidth="0.8" />
      {/* Lamp Lens */}
      <circle
        cx="0"
        cy="-6"
        r="1.8"
        fill={lampColor}
        className={isLampGlowing ? "animate-pulse" : ""}
      />

      {/* Semaphore Arm Pivot */}
      <g transform={`translate(0, -2) rotate(${armAngle})`}>
        {/* Arm Blade (Ivory/Bone with Red or Amber stripe) */}
        <polygon
          points="0,-1.5 14,-1.5 12,1.5 0,1.5"
          fill={isRecovery ? "#C98A2B" : status === "FAILED" ? "#A63A32" : "#E4DCCB"}
          stroke="#121214"
          strokeWidth="0.8"
        />
        {/* Mechanical Spectacle Glass */}
        <circle cx="3" cy="0" r="1.2" fill={lampColor} />
      </g>

      {/* Waiting Approval Expiry Disc (Sweep ring if WAITING_APPROVAL) */}
      {status === "WAITING_APPROVAL" && (
        <g transform="translate(0, -14)">
          <circle cx="0" cy="0" r="3.5" fill="#E4DCCB" stroke="#C98A2B" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="-2.5" stroke="#C98A2B" strokeWidth="0.8" />
          <line x1="0" y1="0" x2="1.8" y2="0" stroke="#C98A2B" strokeWidth="0.8" />
        </g>
      )}
    </g>
  );
};
