const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface EventItem {
  id: string;
  event_type: string;
  mission_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  agent_run_id: string | null;
  tool_run_id: string | null;
  approval_id: string | null;
  correlation_id: string;
  sequence_number: number;
  timestamp: string;
  source: string;
  payload: Record<string, any>;
}

export interface EventListResponse {
  items: EventItem[];
  total: number;
  skip: number;
  limit: number;
}

export async function fetchEvents(params?: {
  mission_id?: string;
  event_type?: string;
  correlation_id?: string;
  skip?: number;
  limit?: number;
}): Promise<EventListResponse> {
  const query = new URLSearchParams();
  if (params?.mission_id) query.append("mission_id", params.mission_id);
  if (params?.event_type) query.append("event_type", params.event_type);
  if (params?.correlation_id) query.append("correlation_id", params.correlation_id);
  if (params?.skip !== undefined) query.append("skip", params.skip.toString());
  if (params?.limit !== undefined) query.append("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/api/v1/events?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMissionEvents(
  missionId: string,
  afterSequence?: number,
  limit: number = 200
): Promise<EventItem[]> {
  const query = new URLSearchParams();
  if (afterSequence !== undefined) {
    query.append("after_sequence", afterSequence.toString());
  }
  query.append("limit", limit.toString());

  const res = await fetch(`${API_BASE}/api/v1/missions/${missionId}/events?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch mission events: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchEventById(id: string): Promise<EventItem> {
  const res = await fetch(`${API_BASE}/api/v1/events/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch event ${id}: ${res.statusText}`);
  }
  return res.json();
}
