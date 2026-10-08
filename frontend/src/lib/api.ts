import {
  Mission,
  Task,
  ApprovalRequest,
  Memory,
  MemorySearchResult,
  PlanRevision,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// --- Missions ---
export async function fetchMissions(): Promise<Mission[]> {
  const res = await fetch(`${API_BASE}/api/v1/missions`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch missions");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function fetchMission(id: string): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch mission");
  return res.json();
}

export async function fetchMissionDAG(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${id}/dag`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch mission DAG");
  return res.json();
}

export async function startMission(id: string): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${id}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to start mission");
  return res.json();
}

export async function pauseMission(id: string): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${id}/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to pause mission");
  return res.json();
}

export async function resumeMission(id: string): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${id}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to resume mission");
  return res.json();
}

// --- Plan Revisions & Replanning ---
export async function fetchMissionPlanRevisions(missionId: string): Promise<PlanRevision[]> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${missionId}/replans`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function triggerMissionReplan(
  missionId: string,
  failedTaskId: string,
  reason?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${missionId}/replan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ failed_task_id: failedTaskId, reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to trigger replan");
  }
  return res.json();
}

// --- Memory ---
export async function fetchMemories(params?: {
  user_id?: string;
  memory_type?: string;
  source?: string;
  mission_id?: string;
  task_id?: string;
  skip?: number;
  limit?: number;
}): Promise<{ items: Memory[]; total: number; skip: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.user_id) query.append("user_id", params.user_id);
  if (params?.memory_type) query.append("memory_type", params.memory_type);
  if (params?.source) query.append("source", params.source);
  if (params?.mission_id) query.append("mission_id", params.mission_id);
  if (params?.task_id) query.append("task_id", params.task_id);
  if (params?.skip !== undefined) query.append("skip", params.skip.toString());
  if (params?.limit !== undefined) query.append("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/api/v1/memory?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch memories");
  return res.json();
}

export async function fetchMissionMemories(
  missionId: string,
  userId: string = "default_operator"
): Promise<Memory[]> {
  const res = await fetch(`${API_BASE}/api/v1/missions/${missionId}/memory?user_id=${userId}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function searchMemories(
  query: string,
  userId: string = "default_operator",
  missionId?: string,
  limit: number = 5
): Promise<MemorySearchResult[]> {
  const res = await fetch(`${API_BASE}/api/v1/memory/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      user_id: userId,
      mission_id: missionId,
      limit,
    }),
  });
  if (!res.ok) throw new Error("Failed to search memory");
  return res.json();
}

export async function createMemory(payload: {
  content: string;
  memory_type?: string;
  source?: string;
  importance?: number;
  user_id?: string;
  mission_id?: string;
  task_id?: string;
  metadata?: Record<string, any>;
}): Promise<Memory> {
  const res = await fetch(`${API_BASE}/api/v1/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: payload.user_id || "default_operator",
      memory_type: payload.memory_type || "SEMANTIC",
      source: payload.source || "MANUAL",
      content: payload.content,
      importance: payload.importance ?? 3,
      mission_id: payload.mission_id,
      task_id: payload.task_id,
      metadata_payload: payload.metadata,
    }),
  });
  if (!res.ok) throw new Error("Failed to create memory");
  return res.json();
}

export async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/memory/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete memory");
}
