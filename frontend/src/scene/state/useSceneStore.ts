import { create } from "zustand";
import {
  CameraPose,
  SpatialView,
  SelectedEntity,
  SpatialTaskNode,
  SpatialConnection,
  SpatialAgentEntity,
  SceneTelemetry,
} from "../types";
import { Mission, Task } from "@/types";

export const CAMERA_PRESETS: Record<SpatialView, CameraPose> = {
  HOME: {
    position: [0, 4, 18],
    target: [0, 0, 0],
    fov: 45,
    transitionSpeed: 1.8,
  },
  MISSIONS: {
    position: [0, 8, 22],
    target: [0, 1, 0],
    fov: 48,
    transitionSpeed: 2.0,
  },
  MISSION_DETAIL: {
    position: [0, 2, 14],
    target: [0, 0, 0],
    fov: 42,
    transitionSpeed: 2.2,
  },
  AGENTS: {
    position: [-3, 3, 12],
    target: [-1, 0.5, 0],
    fov: 40,
    transitionSpeed: 2.0,
  },
  TASKS: {
    position: [0, 6, 16],
    target: [0, 0, 0],
    fov: 45,
    transitionSpeed: 1.8,
  },
  OVERVIEW: {
    position: [0, 15, 25],
    target: [0, 0, 0],
    fov: 50,
    transitionSpeed: 1.5,
  },
};

interface SceneState {
  // Feature flag
  is3DEnabled: boolean;
  set3DEnabled: (enabled: boolean) => void;

  // Camera & Navigation
  cameraPose: CameraPose;
  targetCameraPose: CameraPose;
  activeSpatialView: SpatialView;
  setCameraPose: (pose: Partial<CameraPose>) => void;
  setSpatialView: (view: SpatialView) => void;

  // Entity Selection & Interaction
  selectedEntity: SelectedEntity | null;
  hoveredEntity: SelectedEntity | null;
  selectEntity: (entity: SelectedEntity | null) => void;
  setHoveredEntity: (entity: SelectedEntity | null) => void;

  // Real Domain State for 3D Layer
  missions: Mission[];
  activeMission: Mission | null;
  tasks: Task[];
  spatialNodes: SpatialTaskNode[];
  spatialConnections: SpatialConnection[];
  agentEntities: SpatialAgentEntity[];
  telemetry: SceneTelemetry;

  // Mutations
  setMissions: (missions: Mission[]) => void;
  setActiveMission: (mission: Mission | null) => void;
  setTasks: (tasks: Task[]) => void;
  setSpatialGraph: (nodes: SpatialTaskNode[], connections: SpatialConnection[]) => void;
  setAgentEntities: (agents: SpatialAgentEntity[]) => void;
  setTelemetry: (telemetry: Partial<SceneTelemetry>) => void;
}

const getInitial3DPreference = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("agentic_os_3d_enabled");
    if (stored !== null) {
      return stored === "true";
    }
  } catch {
    // fallback
  }
  return true;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  is3DEnabled: getInitial3DPreference(),
  set3DEnabled: (enabled: boolean) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("agentic_os_3d_enabled", String(enabled));
      } catch {
        // silent fail
      }
    }
    set({ is3DEnabled: enabled });
  },

  cameraPose: CAMERA_PRESETS.HOME,
  targetCameraPose: CAMERA_PRESETS.HOME,
  activeSpatialView: "HOME",

  setCameraPose: (pose) =>
    set((state) => ({
      targetCameraPose: { ...state.targetCameraPose, ...pose },
    })),

  setSpatialView: (view) => {
    const preset = CAMERA_PRESETS[view] || CAMERA_PRESETS.HOME;
    set({
      activeSpatialView: view,
      targetCameraPose: preset,
    });
  },

  selectedEntity: null,
  hoveredEntity: null,
  selectEntity: (entity) => {
    set({ selectedEntity: entity });
    if (entity) {
      // Dynamic camera focus based on entity type
      if (entity.type === "AGENT" && entity.data?.position) {
        const [x, y, z] = entity.data.position;
        set({
          targetCameraPose: {
            position: [x * 1.2, y + 1.5, z + 6],
            target: [x, y, z],
            fov: 38,
            transitionSpeed: 2.5,
          },
        });
      } else if (entity.type === "TASK" && entity.data?.position) {
        const [x, y, z] = entity.data.position;
        set({
          targetCameraPose: {
            position: [x, y + 0.8, z + 5],
            target: [x, y, z],
            fov: 35,
            transitionSpeed: 2.8,
          },
        });
      }
    } else {
      // Return to current view preset
      const view = get().activeSpatialView;
      set({ targetCameraPose: CAMERA_PRESETS[view] || CAMERA_PRESETS.HOME });
    }
  },

  setHoveredEntity: (entity) => set({ hoveredEntity: entity }),

  missions: [],
  activeMission: null,
  tasks: [],
  spatialNodes: [],
  spatialConnections: [],
  agentEntities: [],
  telemetry: {
    activeMissionsCount: 0,
    runningTasksCount: 0,
    pendingApprovalsCount: 0,
    replansCount: 0,
    coreState: "IDLE",
  },

  setMissions: (missions) => set({ missions }),
  setActiveMission: (activeMission) => set({ activeMission }),
  setTasks: (tasks) => set({ tasks }),
  setSpatialGraph: (spatialNodes, spatialConnections) =>
    set({ spatialNodes, spatialConnections }),
  setAgentEntities: (agentEntities) => set({ agentEntities }),
  setTelemetry: (telemetry) =>
    set((state) => ({
      telemetry: { ...state.telemetry, ...telemetry },
    })),
}));
