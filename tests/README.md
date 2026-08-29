# tests/ — Test Suite

## Responsibility

This directory will contain all tests that prove AgentGate's security
guarantees hold under normal operation, adversarial conditions, and failure
modes.

The principle: **every security claim must have a corresponding test that
can fail.** A claim without a test is not a claim — it is a hope.

## Planned test categories

### 1. Policy Engine tests (`tests/policy/`)

Verify that the deterministic rule table classifies every known action
correctly:

```
action: { type: "sql", command: "DROP TABLE sessions" }
→ expected: { tier: "HIGH", decision: "REQUIRE_APPROVAL" }

action: { type: "shell", command: "ls" }
→ expected: { tier: "LOW", decision: "ALLOW" }

action: { type: "unknown", command: "???" }
→ expected: { tier: "HIGH", decision: "REQUIRE_APPROVAL" }  ← fail-closed
```

### 2. Hashing / canonicalization tests (`tests/hashing/`)

Verify that the canonical action representation and SHA-256 hash are stable
and consistent:

```
canonical(action) → always produces the same bytes for the same action
hash(canonical(action)) → same hash regardless of key ordering in input
hash(actionA) ≠ hash(actionB) for distinct actions
```

### 3. Execution Gate tests (`tests/gate/`)

The six mandatory gate scenarios (must all pass before any demo):

```
1. No token                        → BLOCK
2. Valid token (all checks pass)   → EXECUTE
3. Tamper: token for A, action B   → BLOCK (hash mismatch)
4. Replay: token already consumed  → BLOCK
5. Expiry: token past TTL          → BLOCK
6. Deny: token decision = "denied" → BLOCK
```

### 4. Integration tests (`tests/integration/`)

End-to-end flows with all components running (relay, interceptor, gate):

```
propose_action → policy → pending → phone-approve → gate → execute
propose_action → policy → pending → phone-deny    → gate → BLOCK
```

### 5. Security / adversarial tests (`tests/security/`)

Targeted attack scenarios:

```
Tamper:  approve A → swap A→B → attempt execution → BLOCK
Replay:  approve A → execute A → reuse same token → BLOCK
Expiry:  approve A → wait past TTL → attempt execution → BLOCK
Fail-closed (relay down):  propose action → relay unavailable → BLOCK
Fail-closed (AI down):     AI provider unavailable → static fallback works,
                           core approval flow unaffected
```

## Test runner (planned)

- **Framework:** Vitest (compatible with the TypeScript server packages)
- **Location:** tests live alongside the source they test (unit tests) or in
  this `tests/` directory (integration and security scenarios)

## What is NOT implemented yet

**No tests exist.** This directory is a placeholder and planning document only.

Do not create passing tests that mock out the real security logic — they
would give false confidence. The first tests written here will test real,
working gate and policy code.

## Rules for writing tests in this project

1. A test that always passes (e.g. `expect(true).toBe(true)`) is worse than
   no test. Do not write it.
2. Security tests must be able to fail. If the logic they test is not
   implemented, the test must fail until the logic is implemented.
3. Each of the 6 gate scenarios above has a priority equal to P0. They must
   pass before any P1 or P2 work begins.
4. Tamper detection and deny enforcement are core demo requirements — their
   tests must run on every commit once the gate exists.

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 features 2 and 7 (mandatory
  tamper test), P1 features 8 and 9 (replay, expiry)
- `AgentGate_Judge_Submission.md` — Section 12 (Threat Model)
- `TEAM_EXECUTION_PLAN_FINAL.md` — Tasks A3, A4, A9, and C-series
