export type MissionStatus =
  | "PLANNING"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "WAITING_APPROVAL"
  | "FAILED"
  | "COMPLETED"
  | "CANCELLED";

export type TaskStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AgentRole =
  | "planner"
  | "research"
  | "coding"
  | "reviewer"
  | "execution";

export interface Task {
  id: string;
  mission_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  assigned_agent_id?: string;
  dependencies: string[];
  tool_requirements?: string[];
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  status: MissionStatus;
  priority: number;
  progress: number;
  plan_version?: number;
  replan_count?: number;
  current_task_id?: string;
  completed_at?: string;
  tasks?: Task[];
  created_at: string;
  updated_at: string;
}

export type MemoryType = "WORKING" | "EPISODIC" | "SEMANTIC";
export type MemorySource =
  | "TASK_RESULT"
  | "TASK_FAILURE"
  | "TOOL_OUTPUT"
  | "USER_FEEDBACK"
  | "AGENT_REFLECTION"
  | "MANUAL";

export interface Memory {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  source: MemorySource;
  content: string;
  importance: number;
  metadata_payload?: Record<string, any>;
  mission_id?: string;
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MemorySearchResult {
  memory: Memory;
  similarity_score: number;
  recency_score: number;
  importance_score: number;
  mission_match_score: number;
  relevance_score: number;
}

export type ReplanStrategy =
  | "RETRY"
  | "CREATE_RECOVERY_TASK"
  | "MODIFY_PLAN"
  | "SWITCH_TOOL"
  | "REQUEST_HUMAN"
  | "ABORT_MISSION";

export interface PlanRevision {
  id: string;
  mission_id: string;
  version: number;
  parent_version?: number;
  strategy: ReplanStrategy;
  reason: string;
  plan_snapshot: Record<string, any>;
  created_by: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  mission_id: string;
  task_id: string;
  agent_name: string;
  tool_name: string;
  action_description: string;
  parameters: Record<string, any>;
  risk_level: RiskLevel;
  status: "PENDING" | "APPROVED" | "DENIED";
  reason?: string;
  created_at: string;
}

export interface SystemEvent {
  id: string;
  mission_id?: string;
  task_id?: string;
  agent_name?: string;
  event_type: string;
  message: string;
  data?: Record<string, any>;
  created_at: string;
}
