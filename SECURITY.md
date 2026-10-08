# Agentic OS — Security Model & Threat Invariants

## 1. Core Security Invariant

No agent or LLM output may execute powerful tools without passing through the Permission Guard and Risk Evaluation layer.

```text
LLM Structured Decision
       ↓
Agent Runtime
       ↓
Permission Guard (Risk Evaluation)
       ↓
┌───────────────────────┬─────────────────────────┐
│ LOW Risk              │ MED/HIGH Risk           │ CRITICAL Risk
│ (Auto-Execute)        │ (HITL Approval Required)│ (Always Denied)
└───────────────────────┴─────────────────────────┘
```

---

## 2. Guardrails & Defenses

1. **Workspace Sandboxing**:
   - `filesystem.read` and `filesystem.write` strictly validate path boundaries against `settings.WORKSPACE_ROOT`.
   - Path traversal attempts (`../../etc/passwd`, absolute root overrides) are blocked and raise `SecurityViolationError`.

2. **Destructive Command Interception**:
   - `terminal.execute` matches commands against a strict blocklist (`rm -rf /`, `mkfs`, fork bombs, raw block device writes, curl-to-bash pipelines).
   - Safe build/test commands (`npm test`, `git status`) are evaluated for risk and routed to HITL approval checkpoints when modifying state.

3. **Secret Stripping & Sanitization**:
   - Environment variables, API keys, bearer tokens, and passwords (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `POSTGRES_PASSWORD`) are automatically stripped from tool outputs and event logs before persistence or WebSocket broadcast.

4. **Cryptographic Approval Integrity**:
   - Every approval request computes `SHA-256(agent_id + mission_id + task_id + tool_name + json_canonical_args)`.
   - Re-evaluated at decision time. If parameters were mutated between request and decision, the approval is permanently rejected.

5. **Multi-Tenant User Isolation**:
   - All memory and vector similarity queries strictly enforce `WHERE user_id = :user_id`.
   - Unauthorized cross-tenant reads, modifications, or deletions raise `EntityNotFoundError`.

6. **WebSocket Mission Authorization**:
   - Mission-scoped WebSocket channels (`/ws/missions/{mission_id}`) verify token authenticity and ensure the requesting user is authorized to observe that specific mission.
