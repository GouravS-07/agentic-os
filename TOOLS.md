# Agentic OS — Sandboxed Tool Registry Reference

Every tool in Agentic OS implements the `BaseTool` interface, defines strict Pydantic input/output validation schemas, and specifies required capabilities and default risk tiers.

---

## 1. Tool Catalog

| Tool Name | Version | Risk Tier | Required Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filesystem.read` | 1.0.0 | **LOW** | `fs:read` | Read contents of files strictly within the workspace boundary. |
| `filesystem.write` | 1.0.0 | **MEDIUM** | `fs:write` | Write or overwrite files strictly within the workspace boundary. |
| `terminal.execute` | 1.0.0 | **HIGH** | `terminal:execute` | Execute shell commands in a sandboxed process with timeout and output limits. |
| `git.status` | 1.0.0 | **LOW** | `git:read` | Inspect working tree status and branch state. |
| `git.diff` | 1.0.0 | **LOW** | `git:read` | Review file diffs and modifications. |
| `git.log` | 1.0.0 | **LOW** | `git:read` | View commit history and change logs. |
| `git.commit` | 1.0.0 | **MEDIUM** | `git:write` | Stage and commit verified changes to the repository. |
| `search.web` | 1.0.0 | **LOW** | `web:search` | Query web search engines for documentation and code references. |
| `github.mock` | 1.0.0 | **LOW** | `github:read` | Retrieve repositories, PRs, and commit metadata. |

---

## 2. Tool Execution Lifecycle

1. Agent submits structured `ToolRequest(tool_name, arguments)`.
2. `PermissionGuard` inspects agent permissions and evaluates tool argument risk.
3. If risk is `LOW` and policy allows, auto-executes in sandbox.
4. If risk is `MEDIUM` or `HIGH`, creates an `ApprovalRequest` and pauses execution (`WAITING_APPROVAL`).
5. Upon human operator approval, executes tool, captures output, strips secrets, and returns `Observation` to Agent.
