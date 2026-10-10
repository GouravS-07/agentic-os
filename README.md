# Agentic OS — Turn Goals into Autonomous Actions

> **Agentic OS** is an AI agent orchestration platform with memory, tool control, human oversight, real-time observability, and autonomous replanning. Users assign high-level goals and the system decomposes those goals into discrete tasks, orchestrates specialized AI agents, executes actions through sandboxed tools, maintains memory, streams progress in real-time over WebSockets, and replans when failures occur.

---

## 1. System Architecture

```text
                               ┌────────────────────────────────┐
                               │   User Goal / Directive        │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │       Mission Controller       │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │         Planner Agent          │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │   Dynamic DAG Dependency Graph │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   AGENT RUNTIME LOOP                                   │
 │                                                                                        │
 │      ┌──────────────┐         ┌──────────────────┐         ┌──────────────────────┐    │
 │      │  Agent Run   │ ──────► │ Structured Tool  │ ──────► │   Permission Guard   │    │
 │      │ (Coder/Exec) │         │     Request      │         │  (Risk Evaluation)   │    │
 │      └──────────────┘         └──────────────────┘         └──────────┬───────────┘    │
 │             ▲                                                         │                │
 │             │                                       ┌─────────────────┴─────────────┐  │
 │             │                                       │                               │  │
 │             │                                       ▼                               ▼  │
 │             │                            [ LOW / Auto-Approved ]        [ MED/HIGH Risk ]  │
 │             │                                       │                               │  │
 │             │                                       ▼                               ▼  │
 │             │                              ┌────────────────┐             ┌────────────────┐   │
 │             │                              │ Tool Execution │             │  HITL Approval │   │
 │             │                              │   (Sandboxed)  │             │   Checkpoint   │   │
 │             │                              └────────┬───────┘             └────────────────┘   │
 │             │                                       │                                  │
 │             └───────────────────────────────────────┴──────────────────────────────────┘
 │
 └─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                               │
                                   [ Execution Failure? ]
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │        Failure Analyzer        │
                               │  (Categorizes & Ingests Error) │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │        3-Tier Memory           │
                               │  (Working, Episodic, Semantic) │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │       Replanning Engine        │
                               │  - Injects Recovery Task       │
                               │  - Rewires Task DAG            │
                               │  - Emits Plan Revision v2      │
                               │  - Enforces Anti-Loop Limits   │
                               └────────────────────────────────┘
```

---

## 2. Core Capabilities

- **Goal-to-DAG Decomposition**: Planner Agent converts arbitrary natural language objectives into typed, acyclic Directed Acyclic Graphs with strict cycle rejection.
- **Autonomous Agent Execution Loop**: State-machine-governed agent runtime supporting `PLANNER`, `CODER`, `EXECUTOR`, `RESEARCHER`, and `REVIEWER` roles.
- **Sandboxed Tool Registry**: Strict validation schemas and execution bounds for `filesystem.read`, `filesystem.write`, `terminal.execute`, `git.status`, `git.commit`, and `search.web`.
- **Permission Guard & HITL Safety Checkpoints**: Deterministic risk classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) requiring cryptographic SHA-256 bound human operator approval for privileged operations.
- **Real-Time WebSockets & Monotonic Event Bus**: Central event store capturing all domain transitions with monotonic sequence numbering, auto-reconnect, and replay synchronization.
- **3-Tier Vector Memory**: Working (ephemeral), Episodic (experience & failure remediation), and Semantic (vector store with hybrid relevance ranking: $0.50 \cdot \text{Sim} + 0.20 \cdot \text{Rec} + 0.15 \cdot \text{Imp} + 0.15 \cdot \text{Match}$).
- **Autonomous Replanning Engine**: Classifies failures (`DEPENDENCY_FAILURE`, `PERMISSION_DENIED`, `TIMEOUT`, `TOOL_FAILURE`), generates recovery tasks, dynamically updates the DAG, and records immutable plan revisions ($v1 \rightarrow v2$) with anti-loop protection (`MAX_REPLANS = 5`).
- **Dark Command Center UI**: Next.js 14 App Router developer console featuring Global Command Bar, live DAG visualizers, plan evolution timeline, approvals inspector, and activity stream.

---

## 3. Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0 (AsyncIO), Alembic, `pgvector`, Pydantic v2, `aiosqlite`, `asyncpg`, WebSockets.
- **Frontend**: Next.js 14.2 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- **Databases**: SQLite (Development) / PostgreSQL 16 + `pgvector` (Production).

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Service Health Checks: `http://localhost:8000/health` (also aliased at `http://localhost:8000/api/v1/health`)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 5. Five-Minute Demonstration Walkthrough

Follow this step-by-step walkthrough to experience the verified end-to-end user journey through the live interface.

### Prerequisites & Startup
Ensure the prerequisites from Section 4 are met:
- **Python 3.11+** with dependencies installed (`pip install -r requirements.txt`) and SQLite database initialized (`alembic upgrade head`).
- **Node.js 18+ & npm** with dependencies installed (`npm install`).

Start both services in separate terminals:
1. **Backend**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --port 8000
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *(Alternatively, run `npm start` if using a pre-built production bundle).*
3. Open `http://localhost:3000` in your browser.
4. **Observe**: The dark Command Center loads with real-time KPI metrics (Active Missions, Executed Tasks, HITL Approvals, Agent Fleet), the Global Command Bar, and a green `WS LIVE` indicator showing active WebSocket event streaming connected to `ws://localhost:8000/ws`.

### Step 2: Run the Complete Demo Loop
Click the primary **"Run Complete Demo Loop"** quick-action button in the dashboard header.
- **Under the hood (~2 seconds)**: The backend executes the complete autonomous intelligence loop locally in a single coordinated workflow:
  1. Creates the mission *"Portfolio Build Remediate & Deploy"*.
  2. The Planner Agent generates an initial 4-step DAG using deterministic offline plans.
  3. The Execution Agent begins task execution and encounters a simulated build dependency failure (`npm ERR! Cannot find module 'sharp'`).
  4. The Failure Analyzer queries local 3-tier episodic and semantic memory fixtures for past resolutions.
  5. The Replanning Engine dynamically restructures the graph ($v1 \rightarrow v2$) and injects an autonomous recovery task.
  6. The recovery task executes to completion, unblocking downstream dependencies.
- **Observe**: The browser automatically navigates to `/missions/<mission-id>`.

### Step 3: Inspect Plan Evolution & Dynamic Graph Recovery
1. In the mission view, click the **"Plan Evolution"** tab to inspect the graph history:
   - **Plan v1.0 (Initial Plan)**: Initial DAG synthesized with 4 planned tasks.
   - **Plan v2.0 (Replan #1)**: `CREATE_RECOVERY_TASK` action by `replanning_engine` citing `DEPENDENCY_FAILURE` (*"Cannot find module 'sharp' or its native binary for platform win32-x64"*).
2. Switch to the **"Task DAG Visualizer"** tab:
   - Observe **Step 5 (`RECOVERY INJECTION` / Executor)**: *"Fix & Recover: Design system architecture & specifications"*, highlighted with distinct purple styling and dynamically rewired into the execution graph.

### Step 4: 2D vs. 3D Spatial Canvas & Task Telemetry
1. In the top right of the mission header, click the view mode button to cycle between **STANDARD DAG**, **SPATIAL VIEW**, and **INTERLOCKING DIAGRAM**.
2. In **SPATIAL VIEW (3D)**: Observe the hardware-accelerated WebGL scene with directional conduit animations, node status lighting, and camera mode presets (`MISSION OVERVIEW`, `TASK FOCUS`, `DEPENDENCY FOCUS`).
3. Click any task node (in 3D or 2D):
   - In 3D, the camera orbits smoothly to focus on the selected node.
   - The Task Inspection Docket opens on the right, displaying live status (`COMPLETED`), assigned agent (`coder` / `executor`), input/output payloads, and retry metrics.

### Step 5: Interactive Human-in-the-Loop Approval Gate
> **Note:** The Complete Demo Loop executes autonomously from end to end without pausing for manual intervention. To evaluate interactive governance and policy enforcement, use the separate Approvals workflow:
1. Navigate to **Approvals** via the sidebar or visit `http://localhost:3000/approvals`.
2. Inspect the pending security checkpoint (e.g. `terminal.execute` or container verification):
   - Notice the amber `HIGH RISK` badge, target tool arguments, and security rationale.
   - **Cryptographic Binding**: The backend `ApprovalService` verifies strict integrity before authorizing—validating SHA-256 argument hashes, matching `ToolRun` and `AgentRun` entity chains, and re-evaluating `PermissionGuard` policies.
3. Click **"Approve & Execute"**:
   - The approval state machine authorizes the request, transitioning its status to `APPROVED` and clearing the pending counter to `0`.
   - Switch to the **"APPROVED"** tab to inspect the recorded approval audit entry, including the operator identifier, decision timestamp, and recorded execution attempt.
   - **Important Distinction**: This demonstrates the cryptographic integrity verification, permission guard re-validation, and approval lifecycle state transitions. It verifies the governance workflow and audit trail, not that external operating system or third-party tool side effects executed successfully.

### Step 6: Review Activity Stream & Check System Health
1. Navigate to **Activity** via the sidebar or visit `http://localhost:3000/activity`.
2. Observe the chronological, monotonic event stream (`#40 MISSION_COMPLETED`, `#39 TASK_COMPLETED`, `#38 TASK_STARTED`, etc.).
3. Click any event to open the **Event Inspector**, displaying its correlation ID, timestamp, source service, and sanitized JSON payload.
4. Verify backend health in a browser tab or terminal:
   - `http://localhost:8000/health` (Root operational status)
   - `http://localhost:8000/api/v1/health` (API v1 health status)

---

### Verified Local Subsystems vs. Deterministic Mocks

To enable zero-friction local evaluation without external dependencies or cloud costs, Agentic OS clearly demarcates verified local subsystems from offline mock adapters:

| Component | Status | Details |
| :--- | :--- | :--- |
| **DAG Engine & State Machine** | **Verified Local Execution** | Pure production code: topological sort, cycle rejection, atomic state machine transitions, dynamic recovery task injection. |
| **Database & Persistence** | **SQLite Verified (PostgreSQL Supported)** | Local SQLite persistence fully verified via SQLAlchemy 2.0 AsyncIO. PostgreSQL + `pgvector` is architecturally supported via Alembic migrations, but production execution is unverified in this offline suite. |
| **Event Bus & WebSockets** | **Verified Local Execution** | In-process monotonic event dispatch, persistent event recording, and live WebSocket streaming to the browser verified locally. |
| **Tool Execution Sandbox** | **Verified Local Execution** | Local process subshell execution for filesystem, terminal, and git tools verified within `./workspaces` boundaries. |
| **Security & HITL Gate** | **Verified Local Execution** | PermissionGuard risk evaluation, SHA-256 argument binding, and approval request state transitions verified locally. |
| **Frontend & 3D Spatial Canvas**| **Verified Local Execution** | Next.js 14 App Router, Three.js hardware WebGL spatial rendering, and ReactFlow 2D visualizer verified in-browser. |
| **LLM Provider** | **Deterministic Mock (Default)** | Generates canned 4-step plans (`LLM_PROVIDER=mock`). Adapters for Claude, OpenAI, and Gemini exist in codebase; live API calls are unverified. |
| **Embedding Provider** | **Deterministic Mock (Default)** | Computes deterministic vector hashes (`EMBEDDING_PROVIDER=mock`). OpenAI and Gemini vector embeddings supported by configuration. |
| **GitHub Integration** | **Simulated Mock Tool** | `MockGitHubTool` simulates PR and issue responses locally without contacting GitHub or triggering remote webhooks. |

> **Integration Boundary Notice:** Observed and verified behavior in this walkthrough reflects local orchestration against deterministic mock providers. It demonstrates graph restructuring, state transitions, and governance gates. It does not evaluate live external LLM inference, prompt variability, or external service responses, which require valid credentials in `backend/.env`.

---

## 6. Security Boundary & Production Hardening

> **Development Notice:** In development mode, REST endpoints default to operator context (`user_id="default_operator"`) to facilitate local iteration without authentication overhead. Do not expose this service directly to public networks. Before production deployment:
> 1. Configure an API gateway or reverse proxy enforcing cryptographic JWT / OAuth bearer tokens.
> 2. Enable strict database tenancy and role-based access control (RBAC).
> 3. Enforce containerized process sandboxing for terminal tools.

---

## 7. PostgreSQL + pgvector Setup (Production)

To run with PostgreSQL and native vector similarity search:

1. Launch PostgreSQL with pgvector:
```bash
docker run -d --name agentic-os-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16
```
2. Update `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/agentic_os
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
```
3. Run migrations:
```bash
cd backend
alembic upgrade head
```
This automatically enables the `vector` extension and creates HNSW cosine index `idx_memories_embedding_hnsw`.

---

## 8. Automated Test Suite & Verification

### Backend Tests
```bash
cd backend
pytest -v
```
All **75 automated backend unit, integration, and E2E scenario tests** execute and verify the system end-to-end.

### Frontend Tests & Spatial Engine Verification
```bash
cd frontend
npm test
```
Executes domain model unit suites (diffing, event handling, conduit transmission predicates, and orthogonal routing geometry).

### Browser-Level Visual & Integration Verifications
Headless browser verification scripts run with configurable output paths and Chrome executable resolution:
```bash
# Optional environment variables:
#   OUT_DIR / ARTIFACT_DIR: Path to store generated verification screenshots (defaults to ./scratch_output)
#   CHROME_BIN: Path to local Chrome executable

node frontend/scripts/verify-phase-d.mjs
node frontend/scripts/verify-live-interactions.mjs
```

