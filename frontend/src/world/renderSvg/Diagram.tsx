"use client";

import React from "react";
import { useWorldStore } from "../state/worldStore";
import { DISTRICTS } from "../layout/districts";
import { InterlockingDiagram } from "./InterlockingDiagram";

export const Diagram: React.FC = () => {
  const {
    zoomLevel,
    activeMissionId,
    sceneModel,
    selectedDistrict,
    selectDistrict,
    openDocket,
    closeMissionSheet,
  } = useWorldStore();

  // If we are at SHEET level and have an active mission in the SceneModel, render the Interlocking DAG
  if (zoomLevel === "SHEET" && activeMissionId && sceneModel.missions[activeMissionId]) {
    const activeMission = sceneModel.missions[activeMissionId];
    return (
      <div className="w-full h-full relative">
        <InterlockingDiagram
          mission={activeMission}
          tasks={activeMission.stations}
          onSelectTask={(taskId) => {
            if (!taskId) return;
            const st = activeMission.stations.find((s) => s.id === taskId);
            if (st) {
              openDocket({
                type: "STATION",
                id: st.id,
                title: st.title,
                meta: {
                  status: st.state,
                  assigned_agent: st.assignedAgentId,
                  is_recovery: st.isRecovery,
                  retry_count: st.retryCount,
                  description: st.description,
                  dependencies: st.incomingPrerequisites,
                },
              });
            }
          }}
        />
      </div>
    );
  }

  // Otherwise, render the Macro Board Overview
  return (
    <div className="w-full h-full flex items-center justify-center p-8 select-none bg-[#EFE9DC]">
      <svg
        viewBox="-200 -120 400 240"
        className="w-full h-full max-h-[85vh] max-w-[1200px]"
        style={{ shapeRendering: "crispEdges" }}
      >
        {/* Background table grid */}
        <defs>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#CFC6B2" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
        </defs>
        <rect x="-200" y="-120" width="400" height="240" fill="url(#gridPattern)" />

        {/* Large Printed Board Typography under tracks */}
        <text
          x="0"
          y="15"
          textAnchor="middle"
          fill="#CFC6B2"
          fontSize="56"
          fontWeight="900"
          letterSpacing="6"
          fontFamily="var(--font-serif-hero), sans-serif"
          opacity="0.35"
        >
          AGENTIC OS
        </text>

        {/* Main Line Spine (West to East) */}
        <line x1="-180" y1="0" x2="160" y2="0" stroke="#121214" strokeWidth="1.5" />
        <line x1="-180" y1="3" x2="160" y2="3" stroke="#121214" strokeWidth="1.5" />

        {/* The Replan Return Loop (South edge) */}
        <path
          d="M 120 0 L 120 70 L -140 70 L -140 0"
          fill="none"
          stroke="#121214"
          strokeWidth="1.2"
          strokeDasharray="4 2"
        />

        {/* Telegraph Observability Line (North edge) */}
        <line x1="-180" y1="-80" x2="180" y2="-80" stroke="#A8A69E" strokeWidth="1" strokeDasharray="3 3" />
        <text x="-175" y="-85" fill="#3A3A3C" fontSize="6" fontFamily="var(--font-technical), monospace">
          OBSERVABILITY ── TELEGRAPH TAPE LOG
        </text>

        {/* Districts Plates */}
        {Object.values(DISTRICTS).map((d) => {
          const [tx, , tz] = d.cameraWaypoint.target;
          const isSelected = selectedDistrict === d.id;

          return (
            <g
              key={d.id}
              transform={`translate(${tx}, ${tz})`}
              onClick={() => {
                selectDistrict(d.id);
                openDocket({
                  type: "MISSION",
                  id: d.id,
                  title: `${d.label} District`,
                  meta: {
                    district: d.signageName,
                    shortcut: `Key ${d.shortcutKey}`,
                    description: d.description,
                  },
                });
              }}
              className="cursor-pointer group"
            >
              {/* Station plate */}
              <rect
                x="-24"
                y="-10"
                width="48"
                height="20"
                fill={isSelected ? "#E4DCCB" : "#EFE9DC"}
                stroke="#121214"
                strokeWidth={isSelected ? "1.8" : "1"}
              />

              {/* Status accent indicator */}
              <rect
                x="-24"
                y="-10"
                width="3"
                height="20"
                fill={isSelected ? "#C98A2B" : "#3A3A3C"}
              />

              {/* District text */}
              <text
                x="-16"
                y="0"
                fill="#121214"
                fontSize="6.5"
                fontWeight="700"
                letterSpacing="0.5"
                fontFamily="var(--font-signage), sans-serif"
              >
                {d.signageName}
              </text>
              <text
                x="-16"
                y="6"
                fill="#3A3A3C"
                fontSize="4.5"
                fontFamily="var(--font-technical), monospace"
              >
                [KEY {d.shortcutKey}]
              </text>

              {/* Semaphore Signal Indicator */}
              <circle cx="18" cy="-5" r="2.5" fill="#E4DCCB" stroke="#121214" strokeWidth="0.8" />
              <circle cx="18" cy="-5" r="1.2" fill={isSelected ? "#C98A2B" : "#DDE6D3"} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
