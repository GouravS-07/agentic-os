/**
 * AGENTIC OS — INTERLOCKING WORLD STORE (Zustand)
 * Unified state container for camera navigation, semantic zoom, district focus, and dockets.
 */

import { create } from "zustand";
import { SemanticZoomLevel, DistrictId, SceneModel } from "../adapter/types";
import { QualityTier, detectDefaultQualityTier } from "../quality";
import { DISTRICTS } from "../layout/districts";
import { createInitialSceneModel } from "../adapter/reconcile";

export interface DocketState {
  type: "STATION" | "AGENT" | "SIGNAL" | "MISSION" | "APPROVAL" | "LEVER_FRAME";
  id: string;
  title: string;
  meta?: Record<string, any>;
}

export interface CameraPoseState {
  target: [number, number, number];
  distance: number;
  pitch: number; // Degrees
  yaw: number;   // Degrees
}

export interface WorldState {
  isWorldActive: boolean;
  zoomLevel: SemanticZoomLevel;
  selectedDistrict: DistrictId;
  activeMissionId: string | null;
  qualityTier: QualityTier;
  cameraPose: CameraPoseState;
  activeDocket: DocketState | null;
  locatorText: string;
  isMacroPullbackCompleted: boolean;
  isSearchPaletteOpen: boolean;
  sceneModel: SceneModel;

  // Actions
  setWorldActive: (active: boolean) => void;
  setZoomLevel: (level: SemanticZoomLevel) => void;
  selectDistrict: (districtId: DistrictId) => void;
  openMissionSheet: (missionId: string) => void;
  closeMissionSheet: () => void;
  openDocket: (docket: DocketState) => void;
  closeDocket: () => void;
  setQualityTier: (tier: QualityTier) => void;
  updateCameraPose: (pose: Partial<CameraPoseState>) => void;
  completeMacroPullback: () => void;
  toggleSearchPalette: (open?: boolean) => void;
  syncSceneModel: (model: SceneModel) => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  isWorldActive: false,
  zoomLevel: "BOARD",
  selectedDistrict: "CONTROL",
  activeMissionId: null,
  qualityTier: detectDefaultQualityTier(),
  cameraPose: {
    target: [0, 1.5, 0],
    distance: 76,
    pitch: 28,
    yaw: -6,
  },
  activeDocket: null,
  locatorText: "CONTROL › INTERLOCKING TABLE",
  isMacroPullbackCompleted: false,
  isSearchPaletteOpen: false,
  sceneModel: createInitialSceneModel(),

  setWorldActive: (active) => set({ isWorldActive: active }),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  selectDistrict: (districtId) => {
    const district = DISTRICTS[districtId];
    if (!district) return;
    set({
      selectedDistrict: districtId,
      zoomLevel: "DISTRICT",
      cameraPose: {
        target: [...district.cameraWaypoint.target],
        distance: district.cameraWaypoint.distance,
        pitch: district.cameraWaypoint.pitch,
        yaw: district.cameraWaypoint.yaw,
      },
      locatorText: `${district.signageName} › DISTRICT VIEW`,
    });
  },

  openMissionSheet: (missionId) => {
    set((state) => ({
      activeMissionId: missionId,
      zoomLevel: "SHEET",
      locatorText: `MISSIONS YARD › SHEET ${missionId.slice(0, 8)}`,
      cameraPose: {
        target: [-135, 1.0, 0],
        distance: 48,
        pitch: 28,
        yaw: -5,
      },
    }));
  },

  closeMissionSheet: () => {
    const control = DISTRICTS.CONTROL;
    set({
      activeMissionId: null,
      zoomLevel: "BOARD",
      locatorText: "CONTROL › INTERLOCKING TABLE",
      cameraPose: {
        target: [...control.cameraWaypoint.target],
        distance: control.cameraWaypoint.distance,
        pitch: control.cameraWaypoint.pitch,
        yaw: control.cameraWaypoint.yaw,
      },
    });
  },

  openDocket: (docket) => set({ activeDocket: docket }),

  closeDocket: () => set({ activeDocket: null }),

  setQualityTier: (tier) => set({ qualityTier: tier }),

  updateCameraPose: (pose) =>
    set((state) => ({
      cameraPose: { ...state.cameraPose, ...pose },
    })),

  completeMacroPullback: () => set({ isMacroPullbackCompleted: true }),

  toggleSearchPalette: (open) =>
    set((state) => ({
      isSearchPaletteOpen: open !== undefined ? open : !state.isSearchPaletteOpen,
    })),

  syncSceneModel: (model) => set({ sceneModel: model }),
}));

if (typeof window !== "undefined") {
  (window as any).__WORLD_STORE__ = useWorldStore;
}
