"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Task, Mission, PlanRevision } from "@/types";
import type { SceneMission, SceneStation } from "../adapter/types.ts";
import type { MissionDiagramLayout } from "../layout/types.ts";
import { computeMissionLayout } from "../layout/layoutEngine.ts";
import { TrackRoute } from "./TrackRoute.tsx";
import { StationPlate } from "./StationPlate.tsx";
import { JunctionLock } from "./JunctionLock.tsx";
import { MissionHeaderPlate } from "./MissionHeaderPlate.tsx";
import { DiagramToolbar } from "./DiagramToolbar.tsx";

interface InterlockingDiagramProps {
  mission: Mission | SceneMission;
  tasks: (Task | SceneStation)[];
  planRevisions?: PlanRevision[];
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string | null) => void;
  className?: string;
}

/**
 * Interlocking SVG Diagram Renderer
 * Authoritative 2D visual representation of Agentic OS DAGs, tracks, signals, and lock plates.
 */
export const InterlockingDiagram: React.FC<InterlockingDiagramProps> = ({
  mission,
  tasks,
  planRevisions = [],
  selectedTaskId = null,
  onSelectTask,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [layout, setLayout] = useState<MissionDiagramLayout | null>(null);
  const [ghostLayout, setGhostLayout] = useState<MissionDiagramLayout | null>(null);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [showGhostPlan, setShowGhostPlan] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"SHEET" | "BOARD">("SHEET");

  // Pan & Zoom State
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 1. Compute primary layout from live mission & tasks
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingLayout(true);

    computeMissionLayout(mission, tasks, { preservePreviousPositions: true })
      .then((res) => {
        if (!isCancelled) {
          setLayout(res);
          setIsLoadingLayout(false);
        }
      })
      .catch((err) => {
        console.error("Layout calculation failed:", err);
        if (!isCancelled) setIsLoadingLayout(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [mission, tasks]);

  // 2. Compute ghost layout if plan revisions exist
  useEffect(() => {
    if (planRevisions && planRevisions.length > 0) {
      const v1Rev = planRevisions.find((r) => r.version === 1 || (r as any).plan_version === 1);
      if (v1Rev && v1Rev.plan_snapshot?.tasks) {
        computeMissionLayout(
          { ...mission, plan_version: 1 } as any,
          v1Rev.plan_snapshot.tasks
        ).then((res) => setGhostLayout(res));
      }
    }
  }, [mission, planRevisions]);

  // 3. Fit view to container on initial layout load
  const fitView = useCallback(() => {
    if (!layout || !svgRef.current) return;
    const container = svgRef.current.getBoundingClientRect();
    if (container.width === 0 || container.height === 0) return;

    const padding = 50;
    const graphWidth = layout.bounds.width;
    const graphHeight = layout.bounds.height;

    const scaleX = (container.width - padding * 2) / graphWidth;
    const scaleY = (container.height - padding * 2) / graphHeight;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.6);

    const centerX = container.width / 2 - (layout.bounds.minX + graphWidth / 2) * newZoom;
    const centerY = container.height / 2 - (layout.bounds.minY + graphHeight / 2) * newZoom;

    setZoom(newZoom);
    setPan({ x: centerX, y: centerY });
  }, [layout]);

  useEffect(() => {
    fitView();
  }, [fitView]);

  // 4. Mouse and Wheel Interaction Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 3.0));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard navigation across stations
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!layout) return;
    const stationIds = Object.keys(layout.stations);
    if (stationIds.length === 0) return;

    const currentIdx = selectedTaskId ? stationIds.indexOf(selectedTaskId) : -1;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (currentIdx + 1) % stationIds.length;
      onSelectTask?.(stationIds[nextIdx]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (currentIdx - 1 + stationIds.length) % stationIds.length;
      onSelectTask?.(stationIds[prevIdx]);
    } else if (e.key === "Escape") {
      onSelectTask?.(null);
    }
  };

  const planVersion = "plan_version" in mission ? mission.plan_version : ("planVersion" in mission ? (mission as any).planVersion : 1);
  const replanCount = "replan_count" in mission ? mission.replan_count : ("replanCount" in mission ? (mission as any).replanCount : 0);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative w-full h-full flex flex-col bg-[#EFE9DC] text-[#121214] overflow-hidden select-none outline-none ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* 1. Mission Header Plate */}
      <MissionHeaderPlate
        title={mission.title}
        description={"description" in mission ? mission.description : undefined}
        status={mission.status}
        planVersion={planVersion || 1}
        replanCount={replanCount || 0}
      />

      {/* 2. Architectural Diagram Toolbar */}
      <DiagramToolbar
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z * 1.2, 3.0))}
        onZoomOut={() => setZoom((z) => Math.max(z / 1.2, 0.3))}
        onResetZoom={() => setZoom(1.0)}
        onFitView={fitView}
        showGhostPlan={showGhostPlan}
        onToggleGhostPlan={() => setShowGhostPlan((prev) => !prev)}
        hasRevisions={Boolean(planRevisions && planRevisions.length > 0)}
        zoomLevel={zoomLevel}
        onToggleZoomLevel={() =>
          setZoomLevel((prev) => (prev === "SHEET" ? "BOARD" : "SHEET"))
        }
      />

      {/* 3. Main SVG Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ shapeRendering: "geometricPrecision" }}
        >
          {/* Subtle Ivory Grid Pattern */}
          <defs>
            <pattern
              id="interlockingGrid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="#CFC6B2"
                strokeWidth="0.5"
                strokeOpacity="0.45"
              />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width="100%" height="100%" fill="url(#interlockingGrid)" />

          {/* Pan & Zoom Transform Layer */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Giant Printed Watermark Typography under tracks */}
            <text
              x={layout ? layout.bounds.minX + layout.bounds.width / 2 : 200}
              y={layout ? layout.bounds.minY + layout.bounds.height / 2 + 20 : 100}
              textAnchor="middle"
              fill="#CFC6B2"
              fontSize={zoomLevel === "BOARD" ? "56" : "38"}
              fontWeight="900"
              letterSpacing="6"
              fontFamily="var(--font-serif-hero), sans-serif"
              opacity="0.30"
              className="pointer-events-none"
            >
              INTERLOCKING DAG
            </text>

            {/* Ghost Plan v1 Layer (if toggled) */}
            {showGhostPlan && ghostLayout && (
              <g opacity="0.22" className="pointer-events-none">
                {ghostLayout.tracks.map((t) => (
                  <path
                    key={`ghost_track_${t.id}`}
                    d={t.svgPath}
                    fill="none"
                    stroke="#121214"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                ))}
                {Object.values(ghostLayout.stations).map((s) => (
                  <rect
                    key={`ghost_station_${s.id}`}
                    x={s.x}
                    y={s.y}
                    width={s.width}
                    height={s.height}
                    fill="#CFC6B2"
                    stroke="#121214"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                ))}
              </g>
            )}

            {/* Live Interlocking Tracks */}
            {layout && (
              <g id="tracks-layer">
                {layout.tracks.map((track) => (
                  <TrackRoute key={track.id} track={track} />
                ))}
              </g>
            )}

            {/* Multi-Prerequisite Junction Lock Plates */}
            {layout && (
              <g id="lock-plates-layer">
                {Object.values(layout.lockPlates).map((lp) => (
                  <JunctionLock key={`lock_${lp.stationId}`} lockPlate={lp} />
                ))}
              </g>
            )}

            {/* Interlocking Task Stations */}
            {layout && (
              <g id="stations-layer">
                {Object.values(layout.stations).map((station) => (
                  <StationPlate
                    key={station.id}
                    station={station}
                    isSelected={selectedTaskId === station.id}
                    onSelect={(id) => onSelectTask?.(id)}
                  />
                ))}
              </g>
            )}
          </g>
        </svg>

        {/* Loading Indicator */}
        {isLoadingLayout && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#E4DCCB] border border-[#121214] px-2.5 py-1 text-xs font-mono font-bold text-[#121214]">
            <span className="w-2 h-2 bg-[#C98A2B] animate-ping rounded-none" />
            <span>CALCULATING INTERLOCKING ROUTING...</span>
          </div>
        )}
      </div>

      {/* 4. Bottom Status & Keyboard Legend Strip */}
      <div className="w-full bg-[#E4DCCB] border-t border-[#121214] px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-[#3A3A3C] select-none">
        <div className="flex items-center gap-4">
          <span className="text-[#121214] font-bold">INTERLOCKING CONTROL TABLE</span>
          <span>STATIONS: {layout ? Object.keys(layout.stations).length : 0}</span>
          <span>ROUTES: {layout ? layout.tracks.length : 0}</span>
          <span>JUNCTION LOCKS: {layout ? Object.keys(layout.lockPlates).length : 0}</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[#3A3A3C]">
          <span>[ARROWS] SELECT STATION</span>
          <span>[ESC] DESELECT</span>
          <span>[WHEEL] ZOOM</span>
          <span>[DRAG] PAN</span>
        </div>
      </div>
    </div>
  );
};
