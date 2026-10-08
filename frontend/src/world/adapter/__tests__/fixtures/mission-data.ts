/**
 * REAL RECORDED PAYLOAD FIXTURES FROM AGENTIC OS BACKEND
 * Used exclusively for contract testing and regression verification.
 */

export const RECORDED_MISSION = {
  id: "mission-demo-001",
  title: "Build and Deploy Microservice",
  description: "Decompose requirements, synthesize microservice code, scan for vulnerabilities, and deploy.",
  status: "RUNNING",
  plan_version: 1,
  replan_count: 0,
  progress: 0.25,
};

export const RECORDED_TASKS_INITIAL = [
  {
    id: "task-01-spec",
    mission_id: "mission-demo-001",
    title: "1. Architecture Specification",
    description: "Define API schemas and database contracts.",
    status: "COMPLETED",
    priority: 3,
    assigned_agent_id: "agent_planner",
    dependencies: [],
    retry_count: 0,
    max_retries: 3,
    output_data: { schemas_defined: ["User", "Auth", "Token"] },
  },
  {
    id: "task-02-code",
    mission_id: "mission-demo-001",
    title: "2. Synthesize Backend Code",
    description: "Implement FastAPI endpoints and database queries.",
    status: "READY",
    priority: 2,
    assigned_agent_id: "agent_coder",
    dependencies: ["task-01-spec"],
    retry_count: 0,
    max_retries: 3,
  },
  {
    id: "task-03-deploy",
    mission_id: "mission-demo-001",
    title: "3. Deploy to Staging",
    description: "Containerize and publish image to sandbox environment.",
    status: "PENDING",
    priority: 2,
    assigned_agent_id: "agent_executor",
    dependencies: ["task-02-code"],
    retry_count: 0,
    max_retries: 3,
  },
];

export const RECORDED_APPROVAL_REQUEST = {
  id: "appr-sec-01",
  mission_id: "mission-demo-001",
  task_id: "task-03-deploy",
  agent_id: "agent_executor",
  tool_name: "terminal_tool",
  risk_level: "HIGH",
  reason: "Container build requires terminal execution permission",
  arguments: { command: "docker build -t app:v1 ." },
  arguments_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  status: "PENDING",
  requested_at: "2026-10-06T12:00:00Z",
  expires_at: "2026-10-06T12:15:00Z",
};

export const RECORDED_MEMORIES = [
  {
    id: "mem-exp-01",
    memory_type: "EPISODIC",
    source: "TASK_FAILURE",
    content: "Task failed due to missing npm package 'clsx'. Remediated by installing dependency.",
    importance: 4,
    relevance_score: 0.89,
    mission_id: "mission-demo-001",
    task_id: "task-02-code",
  },
];
