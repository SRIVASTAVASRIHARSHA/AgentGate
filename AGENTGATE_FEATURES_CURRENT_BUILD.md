# AgentGate — Features We Are Working On
## Hackathon Build Feature Scope

**Source reference:** `feature_suggestion.md` — the team's feature-enhancement suggestions.

> This is the current execution scope. It does not replace `TECHNICAL_APPROACH_V2.md` or the hackathon roadmap.

---

## P0 — MUST WORK FIRST

### 1. Deterministic Risk & Policy Engine
- Evaluate every agent action before execution.
- Use deterministic rules for risk.
- Return risk level/score and reason.
- Fail closed.
- AI must not make the authorization decision.

**Flow**
```text
Agent action → Policy Engine → Risk + reason → Phone
```

### 2. Cryptographically Bound Authorization
- Canonical action representation.
- SHA-256 action hash.
- WebAuthn authorization.
- Bind authorization to the exact action hash.
- Execution Gate independently recomputes/verifies the hash.
- Add expiry/single-use if stable.

**Mandatory test**
```text
Approve A → change action to B → BLOCK
```

### 3. iQOO Phone Approval Console
Phone must show:
- Pending action.
- Exact action details.
- Risk level.
- Why it is risky.
- Approve.
- Deny.
- Authorization state.
- History if stable.

### 4. MCP Interceptor
```text
AI Agent → MCP Interceptor → propose_action()
```
The action must be captured before execution.

### 5. Relay
```text
MCP Interceptor → Relay → iQOO Phone
```
The exact proposed action must reach the phone.

### 6. Agent Status
Support:
```text
PENDING
APPROVED
DENIED
BLOCKED
EXECUTED
```

### 7. Tamper Detection
```text
Action A approved
→ Action changed to B
→ Hash mismatch
→ BLOCK
```

This is a core demo requirement.

---

## P1 — BUILD AFTER P0 IS STABLE

### 8. Replay Protection
```text
Authorization used once
→ reuse same authorization
→ BLOCK
```

### 9. Expiry
```text
Authorization expires
→ execution attempted
→ BLOCK
```

### 10. Credential / Secret Detection
From `feature_suggestion.md`:
- Detect `.env` access.
- Detect private-key paths.
- Detect obvious API-key-like strings.
- Detect password/secret arguments.
- Escalate suspicious actions to HIGH risk.
- Show a specific warning on the phone.

### 11. Smart Risk Scoring
Move beyond flat LOW/MEDIUM/HIGH when possible.

Potential factors from `feature_suggestion.md`:
- Target sensitivity.
- Reversibility.
- Blast radius.
- Time/context.
- Historical deviation.

Example:
```text
87 / 100
Target sensitivity  +40
Irreversible action +30
Blast radius        +17
```

**Important:** keep the actual security decision deterministic.

### 12. Audit / History
Show a simple timeline:
```text
TIME    ACTION              RESULT
12:04   read file           ALLOWED
12:07   delete files        DENIED
12:09   deploy command      BLOCKED
```

### 13. Local Gemma / On-Device LLM
Use the local/open-source model on the iQOO phone for explanation and creative phone usage.

Architecture:
```text
Deterministic Policy
↓
Risk + facts
↓
Gemma / local model
↓
Human-readable explanation
↓
Phone
```

**Critical rule:**
```text
LLM explains
LLM does NOT authorize
```

If Gemma is unavailable, the deterministic/static explanation must still work.

### 14. Office Kit Workflow
Use Office Kit genuinely during Red Light:
- Phone/laptop interaction as permitted.
- Useful development/testing work.
- Phone remains the functional security surface.
- Do not fabricate HackTracker activity.

---

## P2 — ONLY IF P0/P1 ARE STABLE

### 15. Agent Behavior Dashboard
Possible later additions:
- Action timeline.
- Agent profile.
- Risk trends.
- Anomaly flags.
- Session replay.

### 16. Advanced Analytics / UI Polish
Only after the actual security product is reliable.

---

# NOT FOR THE CURRENT BUILD

The source feature document also proposes these production-grade ideas, but they are deferred unless the core becomes stable early:

- Multi-approver M-of-N authorization.
- Action scheduling/delayed execution.
- Cross-agent identity certificates.
- Smart notification batching.
- Full dry-run/shadow mode.
- GitHub/GitLab commit-bound authorization.
- Wearable/watch approval.
- Compliance exports.
- Plugin/adapter ecosystem.

---

# IMPLEMENTATION ORDER

```text
1. MCP Interceptor
2. Relay
3. Phone pending-action UI
4. Deterministic policy
5. Action hashing
6. WebAuthn
7. Execution Gate
8. Approve
9. Deny
10. Tamper detection
        ↓
11. Replay
12. Expiry
13. Secret detection
14. Better risk scoring
15. Audit/history
16. Local Gemma explanation
17. Office Kit workflow
        ↓
18. Dashboard / polish
```

---

# CORE PRODUCT DEMO

```text
AI proposes risky action
        ↓
AgentGate intercepts
        ↓
Deterministic policy evaluates
        ↓
Phone receives exact action
        ↓
Gemma explains it (if available)
        ↓
Human approves on iQOO phone
        ↓
WebAuthn authorization
        ↓
Execution Gate independently verifies
        ↓
EXECUTE
```

Then prove the security boundary:

```text
Approve A
   ↓
Change A → B
   ↓
Hash mismatch
   ↓
BLOCK
```

And:

```text
DENY
↓
BLOCK
```

---

# FEATURE PRIORITY RULE

If an enhancement causes instability:

```text
DROP THE ENHANCEMENT
↓
PROTECT THE CORE
```

Never sacrifice:
- Phone approval.
- WebAuthn.
- Action hashing.
- Independent Gate verification.
- Deny.
- Tamper detection.
- End-to-end execution.

for a flashy feature.

---

# SOURCE BOUNDARY

This file is based on the uploaded `feature_suggestion.md`.

Use:
- `TECHNICAL_APPROACH_V2.md` → technical architecture/source of truth.
- `ROADMAP_FINAL.md` → hour-by-hour execution.
- `TEAM_EXECUTION_PLAN_FINAL.md` → team ownership.
- `feature_suggestion.md` → enhancement ideas and prioritization.
