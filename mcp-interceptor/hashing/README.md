# mcp-interceptor/hashing/ — Action Canonicalization & SHA-256

## Responsibility

This module produces the **action fingerprint** that binds an authorization
to one exact action and no other.

```
Action object { type, command, target, params }
      ↓
canonicalize()   ← stable, deterministic JSON serialization
                    (sorted keys, normalized whitespace — same input
                     always produces the same byte sequence)
      ↓
sha256()         ← SHA-256 over the canonical bytes
      ↓
action_hash      ← included in the WebAuthn challenge sent to the phone
                    and recomputed by the gate immediately before execution
```

## Why this module exists as a separate boundary

The hash function is called from two independent code paths:

1. **At proposal time** — when the action enters the pipeline, the interceptor
   computes the hash and sends it to the relay-server to be bound into the
   WebAuthn challenge the phone signs.
2. **At execution time** — the Execution Gate independently recomputes the
   hash of the action it is about to run and compares it to the approved hash.

Both paths must use the **exact same canonicalization and hash function**.
A separate module enforces that there is one implementation, not two that
could silently drift apart.

## Security property

If the action changes between proposal and execution — for any reason,
accidental or adversarial — the gate's recomputed hash will not match the
approved hash. The gate blocks.

This is the technical implementation of the "bait-and-switch" defense.

## What will eventually be implemented here

- `canonicalize.ts` — deterministic JSON serialization of an action:
  sorted keys, no extra whitespace, UTF-8 encoding
- `hash.ts` — SHA-256 over the canonical bytes (using Node.js `crypto`)
- `types.ts` — `CanonicalAction`, `ActionHash` types

**Note:** No external crypto library is needed. Node.js built-in `crypto`
module provides SHA-256.

## What is NOT implemented yet

**Nothing is implemented.** This directory is a module boundary and planning
document only.

## Test that must pass

```
canonicalize({ type: "sql", command: "DROP TABLE sessions", target: "db" })
→ always produces the same bytes regardless of input key ordering

hash(canonicalize(actionA)) ≠ hash(canonicalize(actionB))
  for any two distinct actions

gate recomputes hash of the action it received
→ compares to hash in token
→ if action was modified, hashes differ → BLOCK
```

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 feature 2 (Cryptographically
  Bound Authorization — SHA-256 action hash)
- `AgentGate_Judge_Submission.md` — Section 10 (action fingerprint)
- `TEAM_EXECUTION_PLAN_FINAL.md` — Task A4 (`hashing.ts`)
