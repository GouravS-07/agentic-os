"use client";

import React from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Layers, Eye } from "lucide-react";

interface DiagramToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  showGhostPlan: boolean;
  onToggleGhostPlan: () => void;
  hasRevisions: boolean;
  zoomLevel: "SHEET" | "BOARD";
  onToggleZoomLevel: () => void;
}

/**
 * Technical Architectural Toolbar for Interlocking SVG Diagram
 */
export const DiagramToolbar: React.FC<DiagramToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  showGhostPlan,
  onToggleGhostPlan,
  hasRevisions,
  zoomLevel,
  onToggleZoomLevel,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#E4DCCB] border border-[#121214] p-1.5 shadow-sm select-none">
      {/* Zoom Controls */}
      <button
        onClick={onZoomOut}
        className="p-1 text-[#121214] hover:bg-[#EFE9DC] border border-transparent hover:border-[#121214] transition-colors"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <span className="text-[11px] font-mono font-bold text-[#121214] px-1 min-w-[38px] text-center">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={onZoomIn}
        className="p-1 text-[#121214] hover:bg-[#EFE9DC] border border-transparent hover:border-[#121214] transition-colors"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        onClick={onResetZoom}
        className="p-1 text-[#121214] hover:bg-[#EFE9DC] border border-transparent hover:border-[#121214] transition-colors"
        title="Reset 100%"
        aria-label="Reset 100%"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <button
        onClick={onFitView}
        className="p-1 text-[#121214] hover:bg-[#EFE9DC] border border-transparent hover:border-[#121214] transition-colors"
        title="Fit to View"
        aria-label="Fit to View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-[#121214]/30 mx-1" />

      {/* Semantic Zoom Toggle (SHEET <-> BOARD) */}
      <button
        onClick={onToggleZoomLevel}
        className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${
          zoomLevel === "SHEET"
            ? "bg-[#232325] text-[#EFE9DC] border-[#121214]"
            : "bg-[#EFE9DC] text-[#121214] border-[#121214]"
        } transition-colors`}
        title="Toggle Semantic Zoom"
      >
        LEVEL: {zoomLevel}
      </button>

      {/* Ghost Plan Toggle */}
      {hasRevisions && (
        <button
          onClick={onToggleGhostPlan}
          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border ${
            showGhostPlan
              ? "bg-[#C98A2B] text-[#EFE9DC] border-[#121214]"
              : "bg-[#EFE9DC] text-[#3A3A3C] border-[#121214]"
          } transition-colors`}
          title="Toggle Ghost Plan v1 Layer"
        >
          <Layers className="w-3 h-3" />
          <span>GHOST v1</span>
        </button>
      )}
    </div>
  );
};
