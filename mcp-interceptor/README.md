# mcp-interceptor/ — MCP Interception Layer & Laptop Enforcement Pipeline

## Package overview

This is the primary laptop-side package. It owns the full enforcement path
from agent interception through to the final execution decision:

```
AI Agent (MCP-capable, e.g. Claude Code)
      ↓
propose_action(type, command, target, params)    ← MCP tool (stdio)
      ↓
policy/        ← Deterministic Risk & Policy Engine
      ↓
hashing/       ← Canonical action representation + SHA-256 hash
      ↓
[action + hash sent to relay-server → phone → human decision]
      ↓
check_action_status(action_id)                   ← MCP tool (agent polls)
      ↓
gate/          ← Execution Gate: re-verify hash + token before executing
      ↓
EXECUTE / BLOCK
```

## Sub-modules

| Directory | Responsibility |
|---|---|
| `policy/` | Deterministic rule table: classifies every action into LOW / MEDIUM / HIGH |
| `gate/` | Execution Gate: independently re-verifies action hash and authorization token |
| `hashing/` | Canonical action serialization and SHA-256 hash generation |

## Exposed MCP tools

### `propose_action`
- **Input:** `{ type, command, target, params }`
- **Effect:** Validates and normalizes the action, computes its hash, stores it
  as `PENDING`, and triggers the relay boundary.
- **Returns:** `{ action_id, status: "PENDING" }`

### `check_action_status`
- **Input:** `{ action_id }`
- **Returns:** `{ action_id, status, result? }` — agent polls until resolved

## Action statuses

```
PENDING    → waiting for policy evaluation or human decision
APPROVED   → phone authorized; Execution Gate may proceed
DENIED     → phone denied; Execution Gate will block
BLOCKED    → Gate blocked (tamper / replay / expiry / fail-closed)
EXECUTED   → action has completed execution
```

## Security requirement

The agent must have **no alternative execution path** alongside this
interceptor. If a raw shell or file tool is also available to the agent, the
interceptor is not a genuine security boundary.

## Technology (planned)

- **Runtime:** Node.js + TypeScript
- **MCP transport:** stdio (`@modelcontextprotocol/sdk`)
- **Persistence:** SQLite (pending-action store, audit log)
- **Auth verification:** `@simplewebauthn/server` (re-verification at the gate)

## Implemented

- `src/interceptor.ts` — stdio MCP server with proposal and status tools.
- `src/pendingStore.ts` — in-memory pending-action lifecycle store.
- `src/hashing/` — canonical SHA-256 action binding.
- `src/gate/` — independently verifying execution gate.
- `demo-agent/` — MCP configuration and system-instruction templates for a
  no-bypass demo profile.

## What is NOT implemented yet

- Relay delivery, policy evaluation, persistent pending storage, and phone
  authorization remain separate tasks.

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 features 1–7
- `AgentGate_Judge_Submission.md` — Section 7 (INT + GATE components)
- `TEAM_EXECUTION_PLAN_FINAL.md` — Tasks A1, A3, A4, A5
