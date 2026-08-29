# mcp-interceptor/policy/ — Deterministic Risk & Policy Engine

## Responsibility

This module is the **sole authority** that decides whether an agent action
requires human approval, is auto-allowed, or is unconditionally blocked.

It receives a canonicalized action description and produces:

- A **risk tier**: `LOW` | `MEDIUM` | `HIGH`
- A **decision**: `ALLOW` | `REQUIRE_APPROVAL` | `BLOCK`
- A **risk score** (numeric, for display on the phone)
- A set of **facts/reasons** (human-readable, passed to the phone)

```
Canonicalized action
      ↓
Deterministic rule table
      ↓
{ tier, decision, score, reasons[] }
```

## Critical security principle

**The AI/LLM must never be the authority that decides whether an action
requires approval.** The LLM may later generate a human-readable
*explanation* of a risk that has already been classified here — it never
overrides or re-classifies the tier.

Fail-closed: if the action cannot be classified, the default output is
`HIGH` / `REQUIRE_APPROVAL`.

## Planned risk tiers

| Tier | Examples | Decision |
|---|---|---|
| `LOW` | `ls`, `git status`, reading files, running tests | `ALLOW` — auto-allowed, logged only |
| `MEDIUM` | Dependency install, config changes, `git commit`/`git push` (non-force, non-protected) | `REQUIRE_APPROVAL` — phone approval |
| `HIGH` | `DROP TABLE`, destructive deletion, `git push --force`, production deploy, credential/secret operations | `REQUIRE_APPROVAL` — phone approval, full AI explanation, biometric required |

## What will eventually be implemented here

- `policy.ts` — the deterministic rule table evaluating canonicalized actions
- `types.ts` — shared types: `Action`, `RiskTier`, `Decision`, `PolicyResult`
- Credential/secret-detection rules (P1 — feature 10 in `AGENTGATE_FEATURES_CURRENT_BUILD.md`)
- Smart risk scoring with factor breakdown (P1 — feature 11)

## What is NOT implemented yet

**Nothing is implemented.** This directory is a module boundary and planning
document only.

Do not add placeholder logic that pretends to evaluate risk. The first real
code written here will be a working, tested rule table.

## Security tests that must pass before this module is considered done

- Every action the policy engine classifies must match the intended tier.
- An unrecognized action must default to `HIGH` / `REQUIRE_APPROVAL`, never
  to `LOW` / `ALLOW`.
- The module must have zero dependency on any AI/LLM provider.

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 feature 1, P1 features 10–11
- `AgentGate_Judge_Submission.md` — Section 9 (Risk / Policy Engine)
- `TEAM_EXECUTION_PLAN_FINAL.md` — Tasks A3, A4
