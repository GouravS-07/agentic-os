"use client";

import React from "react";
import type { LayoutTrack } from "../layout/types.ts";

interface TrackRouteProps {
  track: LayoutTrack;
}

/**
 * Interlocking Track Route
 * Paired hairlines with 45° chamfers and state-dependent rendering.
 * In case of failure: displays physical break/gap in track with a danger stop bar.
 */
export const TrackRoute: React.FC<TrackRouteProps> = ({ track }) => {
  const { svgPath, status, isRecovery, hasGapOnFailure, points } = track;

  let mainStroke = "#121214";
  let strokeDash: string | undefined = undefined;
  let strokeWidth = 1.6;

  switch (status) {
    case "RUNNING":
      mainStroke = "#C98A2B"; // Amber active route
      strokeDash = "6 4";
      strokeWidth = 2.0;
      break;
    case "FAILED":
      mainStroke = "#A63A32"; // Red danger route
      strokeWidth = 1.8;
      break;
    case "COMPLETED":
      mainStroke = "#3A3A3C"; // Settled ink
      strokeWidth = 1.4;
      break;
    case "READY":
      mainStroke = "#121214"; // Route set
      strokeWidth = 1.6;
      break;
    case "PENDING":
    default:
      mainStroke = "#CFC6B2"; // Pencil dashed
      strokeDash = "4 4";
      strokeWidth = 1.2;
      break;
  }

  // Calculate midpoint for direction arrow / failure stop bar
  const midIndex = Math.floor(points.length / 2);
  const midPoint = points[midIndex] || points[0] || { x: 0, y: 0 };

  return (
    <g className="select-none pointer-events-none">
      {/* Track Bed Base Line (Paired Hairline underlay) */}
      <path
        d={svgPath}
        fill="none"
        stroke="#E4DCCB"
        strokeWidth={strokeWidth + 2.4}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Primary Rail Line */}
      <path
        d={svgPath}
        fill="none"
        stroke={mainStroke}
        strokeWidth={strokeWidth}
        strokeDasharray={isRecovery && status !== "RUNNING" ? "5 3" : strokeDash}
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={status === "RUNNING" ? "animate-pulse" : ""}
      />

      {/* Directional Chevron (Transit flow indicator East) */}
      {status !== "FAILED" && status !== "PENDING" && points.length >= 2 && (
        <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
          <polygon
            points="-3,-3 3,0 -3,3"
            fill={mainStroke}
          />
        </g>
      )}

      {/* Physical Track Gap & Red Stop Bar on Failure */}
      {hasGapOnFailure && (
        <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
          {/* Track Gap Cleared Box */}
          <rect x="-8" y="-6" width="16" height="12" fill="#EFE9DC" stroke="none" />
          {/* Red Physical Stop Bar (Interlocking Barrier) */}
          <rect
            x="-2.5"
            y="-8"
            width="5"
            height="16"
            fill="#A63A32"
            stroke="#121214"
            strokeWidth="0.8"
          />
          {/* Crossbar Hazard Hatch */}
          <line x1="-2" y1="-5" x2="2" y2="5" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="-2" y1="5" x2="2" y2="-5" stroke="#FFFFFF" strokeWidth="0.8" />
        </g>
      )}
    </g>
  );
};
