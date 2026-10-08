import { Mission, Task } from "@/types";
import { useSceneStore } from "../state/useSceneStore";
import { computeSpatialDAGLayout } from "./dagLayoutEngine";
import { SpatialAgentEntity, SceneTelemetry } from "../types";
import { EventItem } from "@/lib/events";

const AGENT_COLORS: Record<string, string> = {
  PLANNER: "#A855F7", // Purple
  RESEARCHER: "#06B6D4", // Cyan
  CODER: "#6366F1", // Indigo
  REVIEWER: "#EC4899", // Pink
  EXECUTOR: "#10B981", // Emerald
};

export class SceneAdapter {
  static syncHomeData(
    missions: Mission[],
    tasks: Task[],
    approvals: any[],
    agentsList: any[]
  ) {
    const store = useSceneStore.getState();

    // 1. Determine active mission
    const activeMission =
      missions.find(
        (m) =>
          m.status === "RUNNING" ||
          m.status === "WAITING_APPROVAL" ||
          m.status === "PLANNING"
      ) || missions[0] || null;

    // 2. Derive Core State
    let coreState: SceneTelemetry["coreState"] = "IDLE";
    if (activeMission) {
      if (activeMission.status === "RUNNING") coreState = "RUNNING";
      else if (activeMission.status === "WAITING_APPROVAL") coreState = "WAITING_APPROVAL";
      else if (activeMission.status === "PLANNING") coreState = "PLANNING";
      else if (activeMission.status === "COMPLETED") coreState = "COMPLETED";
      else if (activeMission.replan_count && activeMission.replan_count > 0) coreState = "RECOVERING";
    }

    const runningTasksCount = tasks.filter((t) => t.status === "RUNNING").length;
    const replansCount = missions.reduce((acc, m) => acc + (m.replan_count || 0), 0);

    store.setTelemetry({
      activeMissionsCount: missions.filter((m) => m.status === "RUNNING").length,
      runningTasksCount,
      pendingApprovalsCount: approvals.length,
      replansCount,
      coreState,
    });

    store.setMissions(missions);
    store.setActiveMission(activeMission);
    store.setTasks(tasks);

    // 3. Compute Spatial Agents
    const defaultAgents = [
      { id: "PLANNER", name: "Planner Agent", type: "PLANNER" },
      { id: "RESEARCHER", name: "Research Agent", type: "RESEARCHER" },
      { id: "CODER", name: "Coding Agent", type: "CODER" },
      { id: "REVIEWER", name: "Reviewer Agent", type: "REVIEWER" },
      { id: "EXECUTOR", name: "Execution Agent", type: "EXECUTOR" },
    ];

    const sourceAgents = agentsList.length > 0 ? agentsList : defaultAgents;
    const numAgents = sourceAgents.length;

    const spatialAgents: SpatialAgentEntity[] = sourceAgents.map((ag, idx) => {
      const typeKey = (ag.type || ag.id || "").toUpperCase();
      const color = AGENT_COLORS[typeKey] || "#06B6D4";
      const assignedTask = tasks.find(
        (t) => t.assigned_agent_id?.toUpperCase() === typeKey && t.status === "RUNNING"
      );

      return {
        id: ag.id,
        name: ag.name,
        type: ag.type,
        status: assignedTask ? "RUNNING" : "IDLE",
        orbitRadius: 5.5 + (idx % 2) * 1.8,
        orbitSpeed: 0.25 + (idx * 0.05),
        orbitAngle: (idx * 2 * Math.PI) / numAgents,
        currentTaskTitle: assignedTask?.title,
        color,
      };
    });

    store.setAgentEntities(spatialAgents);

    // 4. Compute 3D DAG for active mission
    if (activeMission && tasks.length > 0) {
      const missionTasks = tasks.filter((t) => t.mission_id === activeMission.id);
      const targetTasks = missionTasks.length > 0 ? missionTasks : tasks;
      const { nodes, connections } = computeSpatialDAGLayout(targetTasks);
      store.setSpatialGraph(nodes, connections);
    }
  }

  static handleLiveEvent(event: EventItem) {
    const store = useSceneStore.getState();

    if (event.event_type === "TASK_STARTED") {
      store.setTelemetry({ coreState: "RUNNING" });
    } else if (event.event_type === "TASK_FAILED") {
      store.setTelemetry({ coreState: "RECOVERING" });
    } else if (event.event_type === "APPROVAL_REQUESTED") {
      store.setTelemetry({ coreState: "WAITING_APPROVAL" });
    } else if (event.event_type === "MISSION_COMPLETED") {
      store.setTelemetry({ coreState: "COMPLETED" });
    }
  }
}
