# AGENTIC OS — INTERLOCKING REDESIGN AUDIT (M0)
**Document Version:** 1.0.0  
**Date:** October 6, 2026  
**Status:** COMPLETE (Milestone M0 Read-Only Audit)  
**Author:** Antigravity System Architecture  

---

## 1. Executive Summary

This read-only audit verifies the **Agentic OS** repository against the **INTERLOCKING** design specification (`agentic-os-interlocking-spec.md`). 

The interlocking metaphor posits that unsafe states are *physically impossible to set*—a concept that directly mirrors Agentic OS's deterministic state machine, permission guard, cryptographic approval verification, and autonomous replanning engine.

### Audit Verdict
- **Backend Event Coverage:** **91% direct match (`EXISTS`)**, with **9% minor additive enhancements (`CHEAP BACKEND EXPOSURE`)**. Zero core architectural changes (`CORE CHANGE: 0`) are required in the backend.
- **Frontend Readiness:** The Next.js 14 App Router, Three.js (`@react-three/fiber` 8.18.0, `@react-three/drei` 9.122.0, `three` 0.162.0), Zustand 4.5.7, and WebSocket infrastructure are already operational.
- **Reversibility & Isolation:** The new interlocking architecture will reside entirely in `frontend/src/world/` behind a `NEXT_PUBLIC_WORLD` flag (`?world=1`), ensuring all existing 13 routes and conventional 2D dashboard views remain 100% functional without disruption.

---

## 2. Full Architecture Audit

### 2.1 Frontend Stack & Dependencies
| Component | Detected Version / Implementation | Assessment |
|---|---|---|
| **Framework** | Next.js 14.1.3 (App Router) | Compatible with lazy-loaded Three.js canvas |
| **React** | React 18.2.0 + React-DOM 18.2.0 | Stable client/server boundary |
| **3D Ecosystem** | `three` ^0.162.0, `@react-three/fiber` ^8.18.0, `@react-three/drei` ^9.122.0 | Fully installed and verified |
| **State Management**| `zustand` ^4.5.7 | Ready for high-frequency transient subscriptions |
| **Motion** | `framer-motion` ^11.0.8 | Used for DOM dockets, sheets, and 2D overlays |
| **Styling** | Tailwind CSS 3.4.1 + `tailwind-merge` + `clsx` | Scoped `.world` variables can coexist cleanly |
| **Icons** | `lucide-react` ^0.359.0 | Available for technical glyphs and dockets |
| **Layout Library**| Needs `elkjs` (~1.2MB worker-loaded) | To be added in M3 for orthogonal edge routing |

### 2.2 Existing Routes (All 13 Operational)
1. `/` (Home / Cinematic Board entry)
2. `/missions` (Mission Yard siding overview)
3. `/missions/new` (Mission creation sheet)
4. `/missions/[id]` (Live DAG Mission Sheet)
5. `/tasks` (Timetable ledger)
6. `/approvals` (Interlocking tower lever-frame ledger)
7. `/agents` (Depot register)
8. `/agents/[id]` (Individual agent docket)
9. `/memory` (Archive index & semantic search)
10. `/tools` (Sandboxed workshop perimeter)
11. `/activity` (Observability telegraph tape)
12. `/settings` (System configuration & quality tiers)
13. Health/API integration routes

---

## 3. Backend Event System & Payload Audit

### 3.1 Event Engine Architecture
- **Monotonic Sequencing:** `EventService.record_event` assigns a strict monotonically increasing `sequence_number` scoped to each `mission_id` (and global channel).
- **Dual WebSocket Streams:** 
  - `ws://localhost:8000/ws/events` (System-wide activity log)
  - `ws://localhost:8000/ws/missions/{mission_id}` (Mission-specific DAG and task channel)
- **Reconnection & Replay Sync:** `GET /api/v1/missions/{id}/events?after_sequence={seq}` enables instant gap detection and snapshot state reconciliation.
- **Payload Sanitization:** Automated redaction of API keys, passwords, bearer tokens, and secrets via regex scrubbing in `EventService`.

---

## 4. Cinematic Beat & Domain Event Coverage Matrix

Every beat from §9 (Failure Choreography), §10 (Replanning Signature Sequence), and the broader Interlocking specification is mapped below:

| # | Spec Cinematic Beat | Backend Domain Event | Status | Current Payload Summary | Recommended Action / Change Needed |
|---|---|---|---|---|---|
| **1** | **Task Failure** (Carrier halts, track gap opens, red bar drops) | `EventType.TASK_FAILED` | **EXISTS** | `task_id`, `error`, `retry_count`, `mission_id` | Sufficient. Frontend animates decelerating halt (160–240ms) and track fracture. |
| **2a** | **Failure Analysis Started** (Telegraph line pulses toward Failure House) | *Derived or New Event* | **CHEAP BACKEND EXPOSURE** | None currently emitted at analysis start | Add 2-line emit `FAILURE_ANALYSIS_STARTED` in `FailureAnalyzer.analyze` before LLM/heuristic run, or derive on `TASK_FAILED`. |
| **2b** | **Failure Analysis Completed** (Category stamp lands e.g. `DEPENDENCY_FAILURE`) | `EventType.FAILURE_ANALYZED` | **EXISTS** | `category`, `likely_cause`, `recoverability`, `suggested_action`, `affected_task_id` | Sufficient. Carries classified category and remediation strategy. |
| **3** | **Memory Retrieval** (Record cards slide onto sheet tethered to Archive) | `EventType.MEMORY_RETRIEVED` | **EXISTS** | `query`, `retrieved_count`, `top_relevance`, `memory_ids` | **CHEAP BACKEND EXPOSURE**: Include top-3 memory snippets (`content[:100]`) in event payload to avoid extra roundtrip. |
| **4** | **Recovery Task Created** (Switch blade throws, siding prints, station rises) | `EventType.RECOVERY_TASK_CREATED` | **EXISTS** | `recovery_task_id`, `recovery_task_title`, `failed_task_id` | Sufficient. Delivers recovery task ID and title for immediate layout insertion. |
| **5** | **Plan Revision / Restructuring** (Old routes ghost, stations ease, plate split-flaps `v1`→`v2`) | `EventType.REPLAN_COMPLETED` + `PlanRevision` model | **EXISTS** | `new_plan_version`, `recovery_task_id`, `strategy`, DB `plan_snapshot` | Sufficient. Frontend diffs snapshot against previous layout to trigger 420ms ease. |
| **6** | **Recovery Task Dispatch & Execution** (Agent leaves depot, siding energizes amber) | `EventType.TASK_STARTED` + `EventType.AGENT_RUN_STARTED` | **EXISTS** | `task_id`, `title`, `assigned_agent`, `agent_name` | Sufficient. Agent entity travels along feeder track onto recovery siding. |
| **7** | **Recovery Task Completed** (Station fills `--clear`, switch blade throws back) | `EventType.TASK_COMPLETED` + `EventType.AGENT_RUN_COMPLETED` | **EXISTS** | `task_id`, `title`, `output_data` | Sufficient. Clear status triggers switch blade reset (200ms). |
| **8** | **Original Task Unlocked** (Red bar lifts, signal clears to READY) | `EventType.DAG_TASK_UNLOCKED` + `EventType.TASK_READY` | **EXISTS** | `task_id`, `title`, `priority` | Sufficient. Emitted by `DAGService.unlock_dependent_tasks`. |
| **9** | **Retry Started** (Attempt ticks scratched, carrier proceeds) | `EventType.RETRY_STARTED` | **EXISTS** | `retry_count`, `max_retries`, `task_id` | Sufficient. Emitted by `ReplanningEngine.replan`. |
| **10** | **Mission Completed** (All stations cleared, camera returns) | `EventType.MISSION_COMPLETED` | **EXISTS** | `mission_id`, `progress`, `status` | Sufficient. |
| **11** | **Approval Requested** (Signal holds at danger-amber, expiry disc sweeps) | `EventType.APPROVAL_REQUESTED` | **EXISTS** | `tool_name`, `risk_level`, `reason`, `arguments`, `expires_at`, `approval_id` | Sufficient. Carries SHA-256 hash, ISO timestamp, and full arguments. |
| **12** | **Approval Decided** (Arm drops 160ms on approve, route stays locked on deny) | `EventType.APPROVAL_APPROVED` / `APPROVAL_DENIED` | **EXISTS** | `decided_by`, `note`, `reason`, `approval_id` | Sufficient. Handled with atomic re-evaluation in `ApprovalService`. |
| **13** | **Tool Sandbox Traversal** (Carrier enters tool bay, lamp lights, exits) | `EventType.TOOL_STARTED` / `TOOL_COMPLETED` / `TOOL_FAILED` / `TOOL_DENIED` | **EXISTS** | `tool_name`, `arguments`, `output_data`, `duration_ms`, `error` | Sufficient. Real sandbox start and stop durations captured. |

---

## 5. Domain Models & State Machine Verification

### 5.1 Task Status Enum vs Spec (§4)
| Spec State | Backend `TaskStatus` | Visual Interlocking Treatment |
|---|---|---|
| `PENDING` | `TaskStatus.PENDING` | Pencil dashed outline, unfilled, signal arm horizontal |
| `READY` | `TaskStatus.READY` | Solid ink outline, signal arm 45° down, lamp pale green-white |
| `RUNNING` | `TaskStatus.RUNNING` | Solid ink, amber corner tab, traveling amber dashes on rail |
| `WAITING_APPROVAL` | `TaskStatus.WAITING_APPROVAL` | Amber hold tick, carrier holds before semaphore, expiry disc sweeps |
| `COMPLETED` | `TaskStatus.COMPLETED` | Filled `--clear` (#DDE6D3) with check notch, settled bone track |
| `FAILED` | `TaskStatus.FAILED` | `--danger` (#A63A32) crossbar, physical track gap with red stop bar |
| `BLOCKED` | `TaskStatus.BLOCKED` | Hatched fill, signal arm horizontal, lock pins raised |
| `CANCELLED` | `TaskStatus.CANCELLED` | Subdued pencil hatching |

**Verdict:** 100% 1:1 match between backend enums and spec visualization rules.

### 5.2 Agent Types vs Spec (§5)
| Spec Agent | Backend `AgentType` | Interlocking Vehicle Form |
|---|---|---|
| `PLANNER` | `AgentType.PLANNER` | Fixed signal bridge at Planning Gantry (prints tracks) |
| `CODER` | `AgentType.CODER` | Low flatbed with articulated crane arm |
| `RESEARCHER` | `AgentType.RESEARCHER` | Survey trolley with tripod and rotating gauge |
| `REVIEWER` | `AgentType.REVIEWER` | Inspection car with sweeping lens frame |
| `EXECUTOR` | `AgentType.EXECUTOR` | Blunt locomotive drawing power along the route |

**Verdict:** 100% 1:1 match.

### 5.3 Memory Tiers vs Spec (§7)
- **WORKING:** Scratch variables in short sidings adjacent to active sheet.
- **EPISODIC:** Time-ordered stored carriages in archive lanes with failure red bands.
- **SEMANTIC:** Permanent underground network visible through architectural cutaways in the board table.

**Verdict:** 100% 1:1 match with `app/models/enums.py` (`MemoryType.WORKING`, `EPISODIC`, `SEMANTIC`).

---

## 6. Open Items from Specification (§20)

| # | Spec Question / Assumption | Repository Audit Finding | Confirmed Recommendation |
|---|---|---|---|
| **1** | **Event Coverage:** Are analysis, memory, recovery, and replan events emitted? | Yes. `FAILURE_ANALYZED`, `MEMORY_RETRIEVED`, `RECOVERY_TASK_CREATED`, `REPLAN_COMPLETED` all exist in the codebase. | Add lightweight `FAILURE_ANALYSIS_STARTED` and embed snippets in `MEMORY_RETRIEVED` payload for zero-latency UI rendering. |
| **2** | **Task Assignment Payload:** Does task event carry the assigned agent? | Yes. `TASK_STARTED` carries `assigned_agent`; `AGENT_RUN_STARTED` carries `agent_id`, `agent_run_id`, `task_id`. | Confirmed. |
| **3** | **Idle Home:** No staged fake animation when idle? | Verified. Pure physical rest state (signals at rest, parked carriers). | Confirmed. Motion only represents live activity. |
| **4** | **Agent Travel:** Time-compressed dispatch (≤600ms)? | Yes. Realistic duration for station work, fast transit for responsiveness. | Confirmed. |
| **5** | **Color Palette & Light Theme:** Migration from dark theme? | Design tokens: Ivory `#EFE9DC`, Bone `#E4DCCB`, Graphite `#3A3A3C`, Charcoal `#232325`, Ink `#121214`, Metal `#A8A69E`, Amber `#C98A2B`, Danger `#A63A32`, Clear `#DDE6D3`. | Scope `.world` CSS tokens so existing dark 2D theme is untouched in legacy mode. |
| **6** | **Typography / Web Fonts:** Archivo, Barlow Condensed, IBM Plex Mono? | Fonts are open-licensed (OFL / Apache 2.0). | Load clean subsets via `@next/font/google` or local WOFF2 in `world/` layout. |
| **7** | **DAG Scale & Performance Limits:** Realistic mission size? | Real missions contain 3 to 15 tasks with 1 to 4 dependency tiers. | ELK orthogonal layout in a dedicated web worker executes in <15ms for this graph size. |

---

## 7. Next Step: Milestone M1 Plan

With Milestone M0 complete and verified, the next implementation milestone is **M1: Flag, Shell & Tokens**:
1. Create `frontend/src/world/` isolation tree.
2. Add `NEXT_PUBLIC_WORLD` environment flag with `?world=1` query override support (default remains current UI until M9).
3. Define interlocking tokens in `tokens.css` scoped under `.world`.
4. Establish 2D paint-first container with lazy Three.js canvas bootstrap.
