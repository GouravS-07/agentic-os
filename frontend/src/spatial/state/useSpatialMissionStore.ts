/**
 * AGENTIC OS — Spatial Mission Store
 * Zustand store for the Spatial Mission Workspace view mode, selection, and camera state.
 * frameloop="demand" compatible — only invalidates the canvas when state changes.
 */

import { create } from "zustand";

export type SpatialViewMode = "2D" | "SPATIAL";
export type CameraMode = "OVERVIEW" | "TASK_FOCUS" | "DEPENDENCY_FOCUS";

export interface SpatialMissionState {
  viewMode: SpatialViewMode;
  cameraMode: CameraMode;
  selectedNodeId: string | null;
  cameraTarget: [number, number, number];
  cameraDistance: number;
  cameraPitch: number; // in radians
  cameraYaw: number;   // in radians
  // Trigger counter incremented to request a camera focus animation
  focusTrigger: number;
  focusNodeId: string | null;
}

export interface SpatialMissionActions {
  setViewMode: (mode: SpatialViewMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  selectNode: (id: string | null) => void;
  setCameraTarget: (
    target: [number, number, number],
    distance?: number,
    pitch?: number,
    yaw?: number
  ) => void;
  focusNode: (
    nodeId: string,
    target: [number, number, number],
    distance?: number,
    pitch?: number,
    yaw?: number
  ) => void;
  resetCamera: () => void;
}

const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0.28, 0];
const DEFAULT_CAMERA_DISTANCE = 8.5;
const DEFAULT_PITCH = (30 * Math.PI) / 180;
const DEFAULT_YAW = (-14 * Math.PI) / 180;

export const useSpatialMissionStore = create<
  SpatialMissionState & SpatialMissionActions
>((set) => ({
  // State
  viewMode: "2D",
  cameraMode: "OVERVIEW",
  selectedNodeId: null,
  cameraTarget: DEFAULT_CAMERA_TARGET,
  cameraDistance: DEFAULT_CAMERA_DISTANCE,
  cameraPitch: DEFAULT_PITCH,
  cameraYaw: DEFAULT_YAW,
  focusTrigger: 0,
  focusNodeId: null,

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  setCameraMode: (mode) =>
    set((s) => ({
      cameraMode: mode,
      focusTrigger: s.focusTrigger + 1,
    })),

  selectNode: (id) =>
    set({
      selectedNodeId: id,
      cameraMode: id ? "TASK_FOCUS" : "OVERVIEW",
    }),

  setCameraTarget: (target, distance, pitch, yaw) =>
    set((s) => ({
      cameraTarget: target,
      cameraDistance: distance ?? s.cameraDistance,
      cameraPitch: pitch ?? s.cameraPitch,
      cameraYaw: yaw ?? s.cameraYaw,
      focusTrigger: s.focusTrigger + 1,
      focusNodeId: null,
    })),

  focusNode: (nodeId, target, distance, pitch, yaw) =>
    set((s) => ({
      selectedNodeId: nodeId,
      cameraMode: "TASK_FOCUS",
      cameraTarget: target,
      cameraDistance: distance ?? 4.8,
      cameraPitch: pitch ?? (32 * Math.PI) / 180,
      cameraYaw: yaw ?? (-18 * Math.PI) / 180,
      focusTrigger: s.focusTrigger + 1,
      focusNodeId: nodeId,
    })),

  resetCamera: () =>
    set((s) => ({
      cameraMode: "OVERVIEW",
      cameraTarget: DEFAULT_CAMERA_TARGET,
      cameraDistance: DEFAULT_CAMERA_DISTANCE,
      cameraPitch: DEFAULT_PITCH,
      cameraYaw: DEFAULT_YAW,
      focusTrigger: s.focusTrigger + 1,
      focusNodeId: null,
      selectedNodeId: null,
    })),
}));
