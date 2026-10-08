import { Task } from "@/types";
import { SpatialTaskNode, SpatialConnection } from "../types";

export function computeSpatialDAGLayout(tasks: Task[]): {
  nodes: SpatialTaskNode[];
  connections: SpatialConnection[];
} {
  if (!tasks || tasks.length === 0) {
    return { nodes: [], connections: [] };
  }

  // 1. Build adjacency graph and calculate in-degrees
  const taskMap = new Map<string, Task>();
  const inDegree = new Map<string, number>();
  const childrenMap = new Map<string, string[]>();

  tasks.forEach((t) => {
    taskMap.set(t.id, t);
    inDegree.set(t.id, (t.dependencies || []).length);
    childrenMap.set(t.id, []);
  });

  tasks.forEach((t) => {
    (t.dependencies || []).forEach((depId) => {
      if (childrenMap.has(depId)) {
        childrenMap.get(depId)!.push(t.id);
      }
    });
  });

  // 2. Compute topological ranks (layers)
  const rankMap = new Map<string, number>();
  const queue: string[] = [];

  // Root nodes (inDegree === 0) start at rank 0
  tasks.forEach((t) => {
    if ((t.dependencies || []).length === 0) {
      rankMap.set(t.id, 0);
      queue.push(t.id);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentRank = rankMap.get(currentId) || 0;

    const children = childrenMap.get(currentId) || [];
    children.forEach((childId) => {
      const existingRank = rankMap.get(childId) || 0;
      const newRank = Math.max(existingRank, currentRank + 1);
      rankMap.set(childId, newRank);
      queue.push(childId);
    });
  }

  // Group nodes by rank
  const rankGroups = new Map<number, Task[]>();
  tasks.forEach((t) => {
    const rank = rankMap.get(t.id) || 0;
    if (!rankGroups.has(rank)) {
      rankGroups.set(rank, []);
    }
    rankGroups.get(rank)!.push(t);
  });

  // 3. Assign 3D Coordinates
  // X: Spread left-to-right based on topological rank
  // Y: Spread vertically within each rank layer
  // Z: Subtle forward/backward depth stagger for spatial visual hierarchy
  const maxRank = Math.max(0, ...Array.from(rankGroups.keys()));
  const totalWidth = Math.max(8, maxRank * 3.8);
  const startX = -totalWidth / 2;

  const nodePosMap = new Map<string, [number, number, number]>();
  const spatialNodes: SpatialTaskNode[] = [];

  rankGroups.forEach((groupTasks, rank) => {
    const layerX = maxRank === 0 ? 0 : startX + (rank / maxRank) * totalWidth;
    const count = groupTasks.length;
    const spacingY = 2.4;
    const startY = ((count - 1) * spacingY) / 2;

    groupTasks.forEach((t, i) => {
      const isRecovery = t.title.startsWith("Fix & Recover");
      const layerY = startY - i * spacingY + (isRecovery ? 0.6 : 0);
      // Subtle organic wave on Z axis
      const layerZ = (rank % 2 === 0 ? 0.4 : -0.4) + (isRecovery ? 0.8 : 0);

      const pos: [number, number, number] = [layerX, layerY, layerZ];
      nodePosMap.set(t.id, pos);

      spatialNodes.push({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        position: pos,
        dependencies: t.dependencies || [],
        assignedAgentId: t.assigned_agent_id,
        isRecovery,
        retryCount: t.retry_count,
      });
    });
  });

  // 4. Construct Spatial Connections
  const connections: SpatialConnection[] = [];
  tasks.forEach((t) => {
    const targetPos = nodePosMap.get(t.id);
    if (!targetPos) return;

    (t.dependencies || []).forEach((depId) => {
      const sourcePos = nodePosMap.get(depId);
      if (sourcePos) {
        const sourceTask = taskMap.get(depId);
        const isRecoveryConn =
          sourceTask?.title.startsWith("Fix & Recover") ||
          t.title.startsWith("Fix & Recover");

        connections.push({
          id: `${depId}->${t.id}`,
          sourceId: depId,
          targetId: t.id,
          sourcePos,
          targetPos,
          status: sourceTask ? sourceTask.status : "PENDING",
          isRecovery: isRecoveryConn,
        });
      }
    });
  });

  return { nodes: spatialNodes, connections };
}
