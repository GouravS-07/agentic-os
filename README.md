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
API Documentation will be available at `http://localhost:8000/docs`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 5. End-to-End Demo Mode

Agentic OS provides a deterministic, zero-configuration demo runner that demonstrates the complete intelligence loop without requiring external third-party API keys:

```bash
# Trigger the complete intelligence loop via REST:
curl -X POST http://localhost:8000/api/v1/demo/scenarios/complete-loop

# Or seed rich sample data:
curl -X POST http://localhost:8000/api/v1/demo/seed
```
Alternatively, click **"Run Complete Demo Loop"** directly on the dashboard at `http://localhost:3000`.

---

## 6. PostgreSQL + pgvector Setup (Production)

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

## 7. Automated Test Suite & Verification

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

