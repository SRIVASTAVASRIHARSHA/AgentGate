# mcp-interceptor/gate/ — Execution Gate

## Responsibility

The Execution Gate is the **final enforcement point** before any approved
action runs. It operates on the laptop, independently of the phone and
independently of the relay-server.

The gate's rule is absolute:

> **Never execute unless independently verified. Fail closed.**

```
Execution Gate receives: action + authorization token
        ↓
1. Independently recompute action hash (hashing/ module)
2. Compare recomputed hash to the hash bound in the authorization token
   → MISMATCH → BLOCK  (tamper detected — core demo requirement)
3. Verify the authorization token is genuine
   → INVALID → BLOCK
4. Verify the token has not already been used
   → REPLAYED → BLOCK  (replay protection — P1)
5. Verify the token has not expired
   → EXPIRED → BLOCK   (expiry enforcement — P1)
6. Verify the decision in the token is "approved"
   → DENIED → BLOCK
        ↓
ALL CHECKS PASS → EXECUTE
```

## Core security property

The gate does **not** trust any "already verified" flag from the relay-server
or any other component. It independently re-verifies every check itself.

This is the defense against "bait-and-switch": if anything modifies the
action between proposal and execution, the recomputed hash will not match
the approved hash, and the action is blocked.

## Fail-closed behavior

If any check fails, times out, or encounters an unexpected error, the default
outcome is **BLOCK**. The gate never defaults to execution under uncertainty.

## What will eventually be implemented here

- `executionGate.ts` — gate logic: re-verify hash → check signature →
  check replay → check expiry → check decision → execute or block
- `nonceStore.ts` — single-use token/nonce tracking (replay prevention)
- `auditLog.ts` — append-only SQLite log: action, hash, decision, outcome,
  timestamp (every attempt — approved, denied, blocked)

## What is NOT implemented yet

**Nothing is implemented.** This directory is a module boundary and planning
document only.

Do not add placeholder gate logic that returns "EXECUTE" without real
verification. The first real code here must enforce all checks listed above.

## Six mandatory gate tests (must all pass before any P1/P2 work)

1. **No token** → BLOCK
2. **Valid token** (approved, unexpired, unused, hash matches) → EXECUTE
3. **Tamper**: approve action A, attempt to execute action B with A's token → BLOCK
4. **Replay**: reuse an already-consumed token → BLOCK
5. **Expiry**: present a token past its TTL → BLOCK
6. **Deny**: present a token with `decision: "denied"` → BLOCK

Test 3 (tamper) is a core demo requirement per `AGENTGATE_FEATURES_CURRENT_BUILD.md`.

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 features 2, 7; P1 features 8, 9
- `AgentGate_Judge_Submission.md` — Section 10 (Authorization Protocol),
  Section 12 (Threat Model)
- `TEAM_EXECUTION_PLAN_FINAL.md` — Tasks A3, A4, A9
