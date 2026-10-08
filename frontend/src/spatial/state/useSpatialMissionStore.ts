/**
 * AGENTIC OS — Spatial Mission Store
 * Zustand store for the Spatial Mission Workspace view mode, selection, and camera state.
 * frameloop="demand" compatible — only invalidates the canvas when state changes.
 */

import { create } from "zustand";

export type SpatialViewMode = "2D" | "SPATIAL";

export interface SpatialMissionState {
  viewMode: SpatialViewMode;
  selectedNodeId: string | null;
  cameraTarget: [number, number, number];
  cameraDistance: number;
  // Trigger counter incremented to request a camera focus animation
  focusTrigger: number;
  focusNodeId: string | null;
}

export interface SpatialMissionActions {
  setViewMode: (mode: SpatialViewMode) => void;
  selectNode: (id: string | null) => void;
  setCameraTarget: (target: [number, number, number], distance?: number) => void;
  focusNode: (nodeId: string, target: [number, number, number], distance?: number) => void;
  resetCamera: () => void;
}

const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0, 0];
const DEFAULT_CAMERA_DISTANCE = 18;

export const useSpatialMissionStore = create<
  SpatialMissionState & SpatialMissionActions
>((set) => ({
  // State
  viewMode: "2D",
  selectedNodeId: null,
  cameraTarget: DEFAULT_CAMERA_TARGET,
  cameraDistance: DEFAULT_CAMERA_DISTANCE,
  focusTrigger: 0,
  focusNodeId: null,

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  selectNode: (id) => set({ selectedNodeId: id }),

  setCameraTarget: (target, distance) =>
    set((s) => ({
      cameraTarget: target,
      cameraDistance: distance ?? s.cameraDistance,
      focusTrigger: s.focusTrigger + 1,
      focusNodeId: null,
    })),

  focusNode: (nodeId, target, distance) =>
    set((s) => ({
      selectedNodeId: nodeId,
      cameraTarget: target,
      cameraDistance: distance ?? s.cameraDistance,
      focusTrigger: s.focusTrigger + 1,
      focusNodeId: nodeId,
    })),

  resetCamera: () =>
    set((s) => ({
      cameraTarget: DEFAULT_CAMERA_TARGET,
      cameraDistance: DEFAULT_CAMERA_DISTANCE,
      focusTrigger: s.focusTrigger + 1,
      focusNodeId: null,
      selectedNodeId: null,
    })),
}));
