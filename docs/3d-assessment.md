# Agentic OS — 3D Spatial Operating Environment Technical Assessment

**Assessment Date**: October 5, 2026  
**Target Repository**: `agentic-os` (`frontend` & `backend`)  
**Purpose**: Prepare the repository for a cinematic, spatial 3D AI operating environment redesign without modifying existing business logic, breaking API contracts, or disrupting running functionality.

---

# A. Current Architecture

The frontend of Agentic OS is built on **Next.js 14.1.3 App Router** (`react@18.2.0`, `react-dom@18.2.0`) in TypeScript (`typescript@5.4.2`).

### Architectural Characteristics:
1. **Routing Model**: File-system App Router under `frontend/src/app/` with 13 routes (including dynamic routes for missions and agents).
2. **Styling & Design System**: Tailwind CSS 3.4.1 + PostCSS with CommonJS config (`tailwind.config.js`, `postcss.config.js`), custom dark command-center color tokens (`#090A0F` background, `#12141C` surface, `#1A1D28` surface-raised, `#6366F1` primary, `#06B6D4` cyan, `#10B981` emerald, `#F59E0B` amber, `#F43F5E` rose, `#8B5CF6` purple).
3. **Component Hierarchy**:
   * **Root Layout** (`src/app/layout.tsx`): Wraps all pages with `SpatialBackground` (2D Canvas ambient starfield), `Sidebar` (collapsible OS navigation rail), and `TopNav` (floating global command bar).
   * **Visualizers & Components** (`src/components/`):
     * `dag/DAGVisualizer.tsx`: Dimensional node grid displaying task dependencies, agent attributions, live statuses, and recovery badges.
     * `core/AICoreSphere.tsx`: Interactive HTML5 Canvas 3D particle sphere reacting to system states (`IDLE`, `PLANNING`, `RUNNING`, `WAITING_APPROVAL`, `RECOVERING`, `COMPLETED`).
     * `layout/Sidebar.tsx` & `layout/TopNav.tsx`: Grouped OS navigation rail and Raycast-style command bar.
4. **State Management**:
   * Page-level React state (`useState`, `useEffect`, `useCallback`) coupled with REST endpoints and WebSocket hooks.
   * No external state management library (such as Redux or Zustand) is currently installed; state is localized per page and synchronized via WebSocket event replay.

---

# B. Current Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│               FastAPI Backend (Port 8000)                   │
│   - MissionService, TaskService, DAGService, AgentRuntime   │
│   - ReplanningEngine, FailureAnalyzer, MemoryService        │
│   - EventBus (InMemory / Monotonic Sequence per Mission)    │
└──────────────┬───────────────────────────────┬──────────────┘
               │ REST Requests                 │ Real-Time WS
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│ `frontend/src/lib/api.ts`     │ │`frontend/src/lib/useWebSocket.ts`│
│ - fetchMissions()            │ │ - ws://localhost:8000/ws/events│
│ - fetchMission(id)           │ │ - ws://localhost:8000/ws/missions/:id│
│ - fetchMissionDAG(id)        │ │ - Replay sync (`fetchMissionEvents`)│
│ - triggerMissionReplan()     │ └─────────────┬──────────────┘
│ - fetchMemories(), search... │               │
└──────────────┬───────────────┘               │
               │ React State                   │ Live Domain Events
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Page Controller Components                  │
│   `src/app/page.tsx` (Dashboard Command Center)             │
│   `src/app/missions/[id]/page.tsx` (Mission Control Room)   │
│   `src/app/approvals/page.tsx` (Security Checkpoint)        │
│   `src/app/agents/page.tsx`, `src/app/memory/page.tsx`, ... │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Rendered UI                           │
│   - `DAGVisualizer.tsx` (Task dependencies, state badges)   │
│   - `AICoreSphere.tsx` (Canvas 3D holographic projection)   │
│   - Mission Plan Evolution & Memory Timeline                │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Files:
* **Backend Models & State**: `backend/app/models/` (`mission.py`, `task.py`, `agent.py`, `event.py`, `memory.py`, `plan_revision.py`, `enums.py`).
* **Backend Services & Engine**: `backend/app/services/` (`mission_service.py`, `task_service.py`, `dag_service.py`, `event_service.py`, `memory_service.py`, `approval_service.py`) and `backend/app/runtime/` (`agent_runtime.py`, `replanning_engine.py`, `failure_analyzer.py`).
* **Backend WebSocket Gateway**: `backend/app/ws/manager.py` (`/ws/events` and `/ws/missions/{mission_id}`).
* **Frontend REST Client**: `frontend/src/lib/api.ts` & `frontend/src/lib/events.ts`.
* **Frontend WebSocket Hook**: `frontend/src/lib/useWebSocket.ts` (supports auto-reconnection, monotonic sequence tracking, and replay reconciliation).
* **Frontend Route Pages**: `frontend/src/app/**/page.tsx`.

---

# C. Existing Dependencies

Inspected directly from `frontend/package.json`:

| Package Category | Package Name | Version | Current Status |
| :--- | :--- | :--- | :--- |
| **Framework** | `next` | `^14.1.3` | Installed |
| **Core UI** | `react` | `^18.2.0` | Installed |
| **Core UI** | `react-dom` | `^18.2.0` | Installed |
| **Styling** | `tailwindcss` | `^3.4.1` | Installed |
| **Styling** | `postcss` | `^8.4.35` | Installed |
| **Styling** | `autoprefixer` | `^10.4.18` | Installed |
| **Animation** | `framer-motion` | `^11.0.8` | Installed |
| **Icons** | `lucide-react` | `^0.359.0` | Installed |
| **Utilities** | `clsx` | `^2.1.0` | Installed |
| **Utilities** | `tailwind-merge` | `^2.2.1` | Installed |
| **TypeScript** | `typescript` | `^5.4.2` | Installed |
| **3D Rendering** | `three` | *None* | **Not installed** |
| **3D React Fiber**| `@react-three/fiber` | *None* | **Not installed** |
| **3D Helpers** | `@react-three/drei` | *None* | **Not installed** |
| **State Management**| `zustand` | *None* | **Not installed** |
| **Animation** | `gsap` | *None* | **Not installed** |
| **Graph Libraries** | `cytoscape` / `d3` / `vis-network` | *None* | **Not installed** |

*Note: All current 3D visuals (`AICoreSphere.tsx` and `SpatialBackground.tsx`) are executed via pure HTML5 2D Canvas math and `requestAnimationFrame` projection without external WebGL libraries.*

---

# D. Current Routes

| Route | Purpose & Behavior | Primary Components | Proposed Mode (3D / 2D / Hybrid) | Must Work with 3D Flag OFF? |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Command Center home, global goal directive input, active mission spotlight, live stream, KPI tiles | `page.tsx`, `AICoreSphere.tsx`, `TopNav.tsx` | **Hybrid / 3D Cinematic** (3D central core & orbiting entities with floating glass HUD) | **YES** |
| `/missions` | Mission Registry Matrix with status filters and progression bars | `missions/page.tsx` | **Hybrid** (3D mission constellation overview + 2D filter controls) | **YES** |
| `/missions/[id]` | Flagship Mission Control Room: dynamic DAG graph, Plan Evolution timeline, and Memory logs | `missions/[id]/page.tsx`, `DAGVisualizer.tsx` | **Hybrid / 3D Focus** (Interactive 3D DAG & Replanning focus + 2D inspector tabs) | **YES** |
| `/missions/new` | Goal input & initial task breakdown wizard | `missions/new/page.tsx` | **2D Overlay** (Clean focused form with 3D backdrop drift) | **YES** |
| `/tasks` | Operational task center listing all mission tasks with execution triggers | `tasks/page.tsx` | **2D Precision** (High-density tabular/grid view) | **YES** |
| `/approvals` | Security Checkpoint for Human-in-the-Loop tool verification and SHA-256 validation | `approvals/page.tsx` | **2D Precision** (Cryptographic security gate with approve/deny controls) | **YES** |
| `/agents` | Fleet registry of autonomous agents (Planner, Researcher, Coder, Reviewer, Executor) | `agents/page.tsx` | **Hybrid** (3D agent spatial cluster + 2D capability details) | **YES** |
| `/agents/[id]` | Individual agent telemetry, capabilities, and execution run history | `agents/[id]/page.tsx` | **2D Precision / Hybrid** (3D agent aura + 2D run logs) | **YES** |
| `/memory` | 3-Tier memory explorer (Working, Episodic, Semantic) with hybrid vector search tester | `memory/page.tsx` | **2D Precision** (Dense vector rankings, formula inspector, manual ingest modal) | **YES** |
| `/tools` | Sandboxed tool registry and permission guard rules | `tools/page.tsx` | **2D Precision** (Tool schemas, risk classifications) | **YES** |
| `/activity` | Live real-time domain event bus activity stream and inspector | `activity/page.tsx` | **2D Precision** (High-throughput terminal/stream with pause/resume buffer) | **YES** |
| `/settings` | System architecture, runtime configurations, and health telemetry | `settings/page.tsx` | **2D Precision** (Configuration cards and policy matrices) | **YES** |

---

# E. Current DAG Architecture

### 1. Representation of Nodes & Dependencies
* **Backend Model**:
  * Node: `Task` model in `backend/app/models/task.py` with `id`, `mission_id`, `title`, `description`, `status`, `priority`, `assigned_agent_id`, `input_data`, `output_data`, `error_message`, `retry_count`, `max_retries`.
  * Dependency: `TaskDependency` table in `backend/app/models/task.py` with `task_id` (dependent) and `depends_on_task_id` (prerequisite).
* **Validation & Topological Sorting**:
  * `DAGEngine` (`backend/app/core/dag_engine.py`) validates acyclicity (`validate_acyclic`), detects circular dependencies via Kahn's algorithm / DFS, and computes derived mission progression.
* **Frontend Delivery**:
  * Delivered via `GET /api/v1/missions/{id}/tasks` or `GET /api/v1/missions/{id}/dag` as an array of `TaskResponse` objects where each task includes `dependencies: string[]` (array of prerequisite task IDs).
* **Frontend Rendering (`DAGVisualizer.tsx`)**:
  * Maps task IDs to step indices (`Step 1`, `Step 2`, etc.).
  * Calculates downstream dependents (unblocks map) dynamically on the client.
  * Node status styling:
    * `PENDING`: Neutral muted surface.
    * `READY`: Cyan glowing border.
    * `RUNNING`: Indigo/blue pulse with live activity indicator.
    * `WAITING_APPROVAL`: Amber pulse with security gate badge.
    * `COMPLETED`: Emerald border with checkmark.
    * `FAILED`: Crimson border with error trace.
* **Dynamic Replanning & Recovery Representation**:
  * When a task fails, `ReplanningEngine` creates a recovery task (`Fix & Recover: {failed_task.title}`) with status `READY`.
  * The failed task is transitioned to `PENDING` and a dynamic dependency is injected: `recovery_task.id -> failed_task.id`.
  * The recovery task title triggers an explicit `RECOVERY INJECTION` purple badge in the DAG visualizer.
  * Plan revision snapshot is persisted in `plan_revisions` table and mission `plan_version` increments from `1` to `2`.

---

# F. Real-Time Event Architecture

| Cinematic Stage | Existing Backend Event? | Existing Frontend Listener? | What Data Is Available | Required Change |
| :--- | :--- | :--- | :--- | :--- |
| **1. Task failure** | **YES** (`TASK_FAILED`) | **YES** (`useWebSocket` → `missions/[id]/page.tsx`, `page.tsx`) | `task_id`, `error`, `retry_count`, `correlation_id`, `timestamp` | **FRONTEND ONLY** |
| **2. Failure analysis started** | **NO** (`NOT CURRENTLY AVAILABLE`) | **NO** | *None* | **CHEAP BACKEND EVENT EXPOSURE** (Emit `FAILURE_ANALYSIS_STARTED` in `FailureAnalyzer.analyze`) |
| **3. Failure analysis completed** | **YES** (`FAILURE_ANALYZED`) | **YES** (Handled via general domain catch `FAILURE_`) | `category`, `likely_cause`, `recoverability`, `suggested_action`, `affected_task_id` | **FRONTEND ONLY** |
| **4. Memory lookup** | **YES** (`MEMORY_RETRIEVED`) | **YES** (Broadcast on channel `mission:{id}`) | `query`, `retrieved_count`, `top_relevance`, `memory_ids` | **FRONTEND ONLY** |
| **5. Recovery task created** | **YES** (`RECOVERY_TASK_CREATED`) | **YES** (Handled via `RECOVERY_` in detail page) | `recovery_task_id`, `recovery_task_title`, `failed_task_id` | **FRONTEND ONLY** |
| **6. DAG restructure** | **YES** (`DAG_TASK_UNLOCKED` / `REPLAN_COMPLETED`) | **YES** (Handled via `DAG_` and `REPLAN_`) | `new_plan_version`, `recovery_task_id`, `strategy` | **FRONTEND ONLY** |
| **7. Plan v1 → v2** | **YES** (`REPLAN_COMPLETED`) | **YES** (Triggers full data refresh) | `new_plan_version`, `recovery_task_id`, `strategy` | **FRONTEND ONLY** |
| **8. Recovery execution** | **YES** (`TASK_STARTED`) | **YES** (Carries recovery task ID and title) | `task_id`, `title`, `assigned_agent` | **FRONTEND ONLY** |
| **9. Original task retry** | **YES** (`RETRY_STARTED` / `TASK_STARTED`) | **YES** | `retry_count`, `max_retries`, `task_id` | **FRONTEND ONLY** |
| **10. Task success** | **YES** (`TASK_COMPLETED`) | **YES** | `task_id`, `title`, `output_data` | **FRONTEND ONLY** |
| **11. Mission completion** | **YES** (`MISSION_COMPLETED`) | **YES** | `mission_id`, `progress: 100.0`, `status` | **FRONTEND ONLY** |

*Key Takeaway*: **10 out of 11 cinematic stages are already fully implemented and broadcast over WebSockets**. Only 1 stage (`FAILURE_ANALYSIS_STARTED`) is not explicitly emitted, which can either be trivially added with 3 lines of code in `failure_analyzer.py` or inferred immediately from `TASK_FAILED`.

---

# G. Proposed 3D Architecture

The 3D environment will be implemented as a **persistent root presentation layer** that is decoupled from business logic:

```
┌─────────────────────────────────────────────────────────────┐
│                 Backend REST + WebSockets                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Scene Adapter / State Store                │
│                 (`src/lib/scene/SceneStore.ts`)             │
│   - Decoupled from Three.js rendering code                  │
│   - Stores: cameraTarget, visibleLayers, activeDAGNodes,     │
│     selectedEntity, replanCinematicStage, is3DEnabled       │
│   - Translates backend models & events into 3D coordinates  │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Root Persistent 3D Scene   │ │     Precision 2D UI Layer  │
│  (`src/components/3d/`)      │ │  (Floating Glass HUD,      │
│  - Persistent WebGL Canvas   │ │   Command Bar, Nav Rail,   │
│  - Camera Controller (Lerp)  │ │   Approvals Gate, Memory,  │
│  - 3D Agentic Core           │ │   Task Inspector Modal)    │
│  - 3D Dimensional DAG        │ └────────────────────────────┘
│  - 3D Agent Fleet Entities   │
│  - 3D Replanning Animator    │
└──────────────────────────────┘
```

### Key Principles:
1. **Single Persistent Canvas**: Mounted once in `layout.tsx`. Does not unmount or rebuild WebGL shaders during Next.js route changes.
2. **Camera Director**: Route changes and user actions update `SceneStore.cameraTarget`, smoothly gliding the camera between coordinates using delta lerping.
3. **Decoupled 3D DAG Layout**: `dagLayoutEngine.ts` computes 3D coordinates from real `Task[]` and `dependencies[]` dynamically.
4. **Cinematic Replanning Director**: `ReplanningSequence3D.tsx` subscribes to real domain events (`TASK_FAILED` → `FAILURE_ANALYZED` → `MEMORY_RETRIEVED` → `RECOVERY_TASK_CREATED` → `REPLAN_COMPLETED`) and smoothly orchestrates node camera focus and dependency energy lines.

---

# H. Exact File Plan

### NEW FILES
1. `frontend/src/lib/scene/types.ts` — Type contracts for camera coordinates, spatial node layout, and 3D visual states.
2. `frontend/src/lib/scene/SceneStore.ts` — Framework-agnostic reactive scene state store with 3D feature flag support.
3. `frontend/src/lib/scene/dagLayoutEngine.ts` — Pure algorithmic 3D coordinate and Bezier curve calculator for arbitrary DAG graphs.
4. `frontend/src/lib/scene/SceneAdapter.ts` — Adapter mapping backend entities and WebSocket events to scene state.
5. `frontend/src/components/3d/SceneRoot.tsx` — Persistent Three.js root canvas, camera director, and post-processing lighting.
6. `frontend/src/components/3d/Atmosphere.tsx` — Atmospheric depth fog, ambient particle dust, and coordinate floor grid.
7. `frontend/src/components/3d/CentralCore3D.tsx` — 3D procedural Agentic OS Neural Core with dynamic telemetry states.
8. `frontend/src/components/3d/SpatialDAG3D.tsx` — Interactive 3D DAG renderer with node picking and Bezier data flow vectors.
9. `frontend/src/components/3d/AgentFleet3D.tsx` — 3D agent fleet entities with orbital rings and connection lines.
10. `frontend/src/components/3d/ReplanningSequence3D.tsx` — 3D cinematic camera focus and dynamic recovery node materialization animator.
11. `frontend/src/components/ui/SpatialOverlay.tsx` — Minimalist 2D floating HUD with cinematic typography and camera view controls.

### MODIFIED EXISTING FILES
1. `frontend/package.json`
   * *Why*: Add `three` and `@types/three` for core WebGL rendering.
2. `frontend/src/app/layout.tsx`
   * *Why*: Mount `SceneRoot` once at the root level and provide scene context across all route changes.
3. `frontend/src/app/globals.css`
   * *Why*: Add utility classes for 3D canvas layering (`pointer-events-none` on background layer, `pointer-events-auto` on HUD overlays).
4. `frontend/src/app/page.tsx`
   * *Why*: Connect Home page to `SceneStore`, set Home camera vantage point, and display cinematic typography.
5. `frontend/src/app/missions/[id]/page.tsx`
   * *Why*: Sync active mission DAG and WebSocket events with `SpatialDAG3D` and `ReplanningSequence3D`.
6. `frontend/src/components/dag/DAGVisualizer.tsx`
   * *Why*: Add a toggle between "Spatial 3D Graph" and "Precise 2D Matrix".
7. `frontend/src/components/layout/TopNav.tsx`
   * *Why*: Add 3D Experience toggle switch (`3D ON / 3D OFF`) in the command bar.

### FILES THAT SHOULD NOT BE TOUCHED
* All backend core logic and schemas (`backend/app/services/*`, `backend/app/runtime/*`, `backend/app/models/*`, `backend/app/ws/*`, `backend/app/api/*`).
* All backend test suites (`backend/tests/*`).
* Operational 2D views (`frontend/src/app/approvals/page.tsx`, `frontend/src/app/settings/page.tsx`, `frontend/src/app/memory/page.tsx`, `frontend/src/app/activity/page.tsx`).

---

# I. Migration Strategy

A **zero-regression feature flag** (`enable3D: boolean`) will be built directly into `SceneStore.ts` and surfaced as a persistent toggle in `TopNav.tsx` (persisted in `localStorage`):

* **When `3D ON` (Default)**:
  * Persistent 3D WebGL scene mounts in `layout.tsx`.
  * Navigation smoothly glides camera between Home, Missions, DAG, and Agent fleet.
  * DAG Visualizer renders in Spatial 3D mode.
* **When `3D OFF`**:
  * 3D WebGL canvas unmounts / suspends rendering.
  * Standard 2D UI elements and fallback 2D DAG Visualizer render with 100% functionality.
  * Zero overhead on lower-end devices or headless environments.

---

# J. Technical Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **WebGL Context Loss on Route Change** | Medium | Mount canvas **strictly in `RootLayout`** so Next.js App Router keeps WebGL context alive across client-side page transitions. |
| **Next.js SSR / Hydration Mismatch** | High | Wrap 3D canvas components with dynamic client-side loading (`'use client'` + mounted guard). |
| **GPU Memory Leaks from Dynamic Nodes**| Medium | Implement explicit geometry/material disposal methods in Three.js hooks when missions or tasks change. |
| **WebSocket Event Out-of-Order Glitches**| Low | Rely on existing monotonic sequence numbers (`sequence_number`) to sequence 3D replanning animations. |
| **High Complexity DAG Overlap** | Medium | Use layered topological rank sorting with dynamic radius expansion for large node counts. |
| **Reduced Motion / Accessibility** | Low | Detect `prefers-reduced-motion` media query and disable camera glide animations accordingly. |
| **Mobile & Touch Performance** | Low | Cap pixel ratio at `Math.min(window.devicePixelRatio, 2)` and limit particle density. |

---

# K. Phase 1 and Phase 2 Implementation Plan

### Phase 1 — 3D Infrastructure & Scene Shell
1. Install `three` and `@types/three`.
2. Implement `SceneStore.ts`, `types.ts`, and `SceneAdapter.ts`.
3. Implement `SceneRoot.tsx`, `Atmosphere.tsx`, and camera delta lerp controller.
4. Mount `SceneRoot` in `src/app/layout.tsx` behind the `is3DEnabled` flag.
5. Add `3D ON / 3D OFF` toggle to `TopNav.tsx`.

### Phase 2 — Cinematic Home & Command Center
1. Implement procedural `CentralCore3D.tsx` reacting to live system telemetry (`IDLE`, `PLANNING`, `RUNNING`, `WAITING_APPROVAL`, `RECOVERING`, `COMPLETED`).
2. Implement `AgentFleet3D.tsx` orbital entity representation.
3. Transform `src/app/page.tsx` into cinematic entry experience with extreme negative space, huge typography, and floating situational metrics.
4. Connect Global Command Bar directive submission to 3D core acceleration animation.

---

# L. Verification Plan

| Verification Step | Target / Method | Success Criteria |
| :--- | :--- | :--- |
| **Backend Test Suite** | `pytest` | **All 75 tests passing (100% green)** |
| **Frontend Production Build** | `npm run build` | **0 errors across all 13 routes** |
| **Route Navigation** | Test `/`, `/missions`, `/missions/[id]`, `/tasks`, `/approvals`, `/agents`, `/memory`, `/activity`, `/settings` | Smooth camera transitions without WebGL context reload or page flicker |
| **Feature Flag Verification** | Toggle `3D ON` / `3D OFF` in TopNav | Clean instant switch between 3D spatial mode and pure 2D mode |
| **Real-time DAG & Replanning** | Trigger `/api/v1/demo/scenarios/complete-loop` | Real-time 3D failure highlight, recovery node injection, and dependency rewiring driven by live WebSocket events |
| **Performance Benchmark** | Chrome DevTools Performance | Steady 60fps on desktop, zero memory leak over 5-minute continuous run |

---

**Conclusion**: The repository architecture, real-time WebSocket infrastructure, and data contracts are **100% ready** for Phase 1 and Phase 2 implementation.
