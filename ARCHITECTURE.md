# Agentic OS — Architecture & Subsystem Specification

## 1. Domain Model Hierarchy

```text
Mission (1)
 ├── Tasks (1..N)
 │    ├── Dependencies (DAG edges)
 │    ├── Agent Runs (1..N)
 │    └── Tool Runs (1..N)
 ├── Plan Revisions (1..N) [Snapshots: v1 -> v2 -> v3]
 ├── Events (1..N) [Monotonic sequence stream]
 └── Memories (Scoped context)
```

---

## 2. Subsystem Invariants

### 1. State Machine Transitions
- **Missions**:
  - `PLANNING` $\rightarrow$ `READY` $\rightarrow$ `RUNNING` $\leftrightarrow$ `PAUSED` / `WAITING_APPROVAL` $\rightarrow$ `COMPLETED` / `FAILED` / `CANCELLED`
- **Tasks**:
  - `PENDING` $\rightarrow$ `READY` $\rightarrow$ `RUNNING` $\leftrightarrow$ `WAITING_APPROVAL` $\rightarrow$ `COMPLETED` / `FAILED` / `CANCELLED`
- **Invalid Transitions Rejected**: Attempting to skip states (e.g. `PENDING` directly to `COMPLETED`) raises explicit `InvalidStateTransitionError`.

### 2. DAG Dependency Solver
- Edge $(u, v)$ signifies that task $u$ depends on task $v$ ($v$ must complete before $u$ becomes `READY`).
- Cycles and self-dependencies are rejected before database persistence using Kahn's algorithm topological sorting.
- Task readiness and derived mission progress ($0.0 \dots 100.0\%$) are computed dynamically from completed active tasks.

### 3. Permission Guard & Security Boundary
- LLM outputs can **never** directly invoke OS system calls, terminals, or filesystems.
- The lifecycle is strictly:
  $$\text{Agent} \longrightarrow \text{Structured ToolRequest} \longrightarrow \text{PermissionGuard} \longrightarrow \begin{cases} \text{LOW Risk} \longrightarrow \text{Auto-Execute} \\ \text{MED/HIGH Risk} \longrightarrow \text{Approval Request (WAITING\_APPROVAL)} \\ \text{CRITICAL Risk} \longrightarrow \text{DENIED} \end{cases}$$
- **Cryptographic Binding**: Approval items are bound to `sha256(agent_id + mission_id + task_id + tool_name + normalized_args)`. If arguments or context mutate, the approval is invalidated.

### 4. Event Bus & Real-Time Gateway
- In-memory async pub/sub EventBus broadcast across WebSocket rooms (`/ws/missions/{id}` and `/ws/system`).
- Every event is persisted with a monotonic `sequence_number` per mission to support seamless client reconnection and event replay.
- WebSocket connections enforce mandatory user authorization before granting access to mission channels.

### 5. 3-Tier Memory Architecture
- **Working Memory**: Ephemeral traces and tool observation buffers with bounded context windows.
- **Episodic Memory**: Meaningful failure analysis traces, user feedback, and recovery strategies.
- **Semantic Memory**: Persistent vector store with hybrid relevance ranking:
  $$\text{Relevance} = 0.50 \times \text{Similarity} + 0.20 \times \text{Recency} + 0.15 \times \text{Importance} + 0.15 \times \text{MissionMatch}$$
- **Tenant Isolation**: All memory queries strictly filter by `user_id`.

### 6. Failure Analyzer & Replanning Engine
- Structured failure taxonomy (`DEPENDENCY_FAILURE`, `PERMISSION_DENIED`, `TIMEOUT`, `TOOL_FAILURE`, `VALIDATION_FAILURE`, `RESOURCE_EXHAUSTED`, `AGENT_ERROR`, `UNKNOWN`).
- **Dynamic DAG Rewiring**: Generates a Recovery Task ($X$), adds dependency edge $(B, X)$, resets failed Task $B$ to `PENDING`, sets $X$ to `READY`, and saves an immutable `PlanRevision` snapshot.
- **Anti-Loop Guards**: Enforces `MAX_REPLANS_PER_MISSION = 5` and `MAX_TASK_ATTEMPTS = 3`.
