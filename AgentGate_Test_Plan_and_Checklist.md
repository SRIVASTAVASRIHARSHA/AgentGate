# AgentGate — Test Plan & Test Checklist

> **Owner:** Person C — Testing, Documentation & Demo Operations  
> **Project:** AgentGate — iQOO Hackathon 2026  
> **Status:** QA document/template; mark results only after actually running the implementation.
>
> This document is derived from the team's current execution plan, README, and current feature scope. The Execution Gate, action hashing, WebAuthn, deterministic policy, MCP interceptor, relay, phone approval console, deny flow, tamper detection, replay/expiry, audit/history, AI fallback, and Office Kit checks are included according to the documented build scope.

---

# 1. TEST PLAN

## 1.1 Objective

Verify that AgentGate:

1. Intercepts protected AI-agent actions before execution.
2. Evaluates actions using the deterministic policy engine.
3. Sends the exact proposed action to the iQOO phone.
4. Requires genuine human authorization through the phone.
5. Binds authorization to the exact action.
6. Allows execution only after the Execution Gate independently verifies the authorization and action.
7. Blocks denied, tampered, replayed, expired, invalid, or otherwise unauthorized actions.
8. Fails closed when required infrastructure is unavailable.
9. Records accurate audit/history information.
10. Provides a repeatable and reliable end-to-end demonstration.

## 1.2 QA Principle

The central invariant being tested is:

> **No protected action executes unless the Execution Gate independently verifies a valid authorization bound to the exact action.**

The phone is the human authorization boundary. The Execution Gate is the enforcement boundary.

AI-generated explanations may describe an already-classified action, but AI must not decide authorization or risk.

## 1.3 Scope

### P0 — Mandatory

- MCP interception / proposal path
- Deterministic policy evaluation
- Risk level and reason
- Relay delivery
- Phone pending-action display
- WebAuthn registration/signing
- Approve flow
- Deny flow
- Canonical action representation
- SHA-256 action hash
- Action-bound authorization
- Independent Execution Gate verification
- Tamper detection
- Agent status transitions
- Basic audit logging
- End-to-end execution/blocking

### P1 — Required after P0 is stable

- Replay protection
- Expiry
- Relay failure / fail-closed behavior
- AI-provider failure / safe fallback
- Credential/secret detection
- Smart/context-aware risk scoring, if implemented
- Audit/history screen
- Local/open-source explanation tier, if implemented
- Office Kit workflow verification

### P2 — Test only if implemented and stable

- Agent behavior dashboard
- Advanced analytics/UI polish

### Deferred unless explicitly implemented

- Multi-approver authorization
- Action scheduling
- Cross-agent identity
- Notification batching
- Shadow/dry-run mode
- GitHub/GitLab commit-bound authorization
- Wearable approval
- Compliance exports
- Plugin/adapter ecosystem

Do not mark deferred features as failed. Mark them **NOT IMPLEMENTED / OUT OF SCOPE**.

---

# 2. TEST ENVIRONMENT RECORD

Complete this when implementation becomes runnable.

| Item | Value |
|---|---|
| Repository/branch | |
| Commit tested | |
| Laptop OS | |
| Node.js version | |
| npm version | |
| Browser | |
| iQOO phone model | |
| Phone OS/version | |
| Relay URL/environment | |
| MCP client/agent | |
| Database | SQLite |
| Network | |
| Test date/time | |

---

# 3. TEST RESULT DEFINITIONS

Use only these statuses:

- **PASS** — expected behavior was observed and independently verified.
- **FAIL** — actual behavior differs from expected behavior.
- **BLOCKED** — test could not be executed because a dependency/build/environment was unavailable.
- **NOT TESTED** — test has not yet been run.
- **NOT IMPLEMENTED** — feature is not present in the current build.

Never use “probably works”, “looks good”, or “seems fine”.

For security tests, a PASS requires checking the actual execution outcome/state, not only the UI message.

---

# 4. TEST EVIDENCE RULE

For every executed test, record:

1. Test ID
2. Date/time
3. Commit/build tested
4. Preconditions
5. Exact action/input
6. Expected result
7. Actual result
8. Execution state/result
9. PASS/FAIL/BLOCKED
10. Evidence location (screenshot, terminal output, log, audit entry, etc.)

For security tests, capture enough evidence to prove that the action was actually blocked or executed.

---

# 5. P0 TEST CASES

## T01 — MCP Action Interception

**Objective:** Verify that the agent proposes the action through the MCP interceptor before protected execution.

**Preconditions**
- MCP interceptor is running.
- Demo agent is configured with the AgentGate MCP server.
- No alternate raw-shell execution path is available alongside the intended demo MCP path.

**Procedure**
1. Ask the agent to perform a protected/risky action.
2. Observe the MCP call.
3. Confirm the action is captured as a proposal.
4. Confirm it reaches the AgentGate pipeline before execution.

**Expected**
- `propose_action()` is invoked.
- The exact action is captured.
- The protected action does not execute directly before authorization.

**Evidence:** MCP/terminal logs.

**Result:** NOT TESTED

---

## T02 — Deterministic Policy Evaluation

**Objective:** Verify that the policy engine evaluates the action before execution.

**Procedure**
1. Submit a known test action.
2. Observe policy output.
3. Record risk level/score and reason if implemented.

**Expected**
- Policy produces a deterministic risk classification/reason.
- The AI explanation layer does not make the authorization decision.

**Result:** NOT TESTED

---

## T03 — Phone Receives Exact Action

**Objective:** Verify that the exact proposed action reaches the iQOO phone.

**Procedure**
1. Trigger a proposal.
2. Observe the phone pending-action screen.
3. Compare the displayed action with the laptop proposal.

**Expected**
- The phone receives the request.
- The action details match exactly.
- Delivery occurs through the implemented real-time path within the documented target; polling fallback is tested separately.

**Result:** NOT TESTED

---

## T04 — WebAuthn Registration

**Objective:** Verify real device registration.

**Procedure**
1. Open the phone PWA.
2. Tap Register Device.
3. Complete device user verification using the available WebAuthn mechanism.
4. Confirm server-side registration succeeds.

**Expected**
- A device-bound credential is registered.
- Server verification succeeds.
- No fake/local-only approval state is used.

**Result:** NOT TESTED

---

## T05 — WebAuthn Signing

**Objective:** Verify real authorization signing from the phone.

**Procedure**
1. Start a test authorization challenge.
2. Complete device user verification.
3. Submit the signed response.
4. Confirm server-side verification.

**Expected**
- The phone signs the challenge.
- Server verification succeeds.
- The signature is associated with the intended authorization.

**Result:** NOT TESTED

---

## T06 — Execution Gate Blocks Without Authorization

**Objective:** Verify fail-closed default behavior.

**Procedure**
1. Submit a protected action without a valid authorization.
2. Attempt execution through the Execution Gate.

**Expected**
- Execution is blocked.
- No protected action is executed.
- The attempt is logged.

**Result:** NOT TESTED

---

## T07 — Valid Authorization Executes

**Objective:** Verify the happy-path security flow.

**Procedure**
1. Submit a harmless protected demo action.
2. Receive it on the phone.
3. Approve it.
4. Complete WebAuthn user verification.
5. Allow the Execution Gate to verify the authorization.
6. Verify the actual system state after execution.

**Expected**
- Authorization is valid and action-bound.
- Gate independently verifies it.
- Action executes.
- Audit log records the attempt/result.

**Result:** NOT TESTED

---

## T08 — Deny Blocks Execution

**Objective:** Verify that denial is enforced and is not merely a UI state.

**Procedure**
1. Submit a harmless protected demo action.
2. Confirm it appears on the phone.
3. Select Deny.
4. Verify the gate receives the denial.
5. Verify the action did not execute.
6. Verify the agent receives the denial result and reacts accordingly.

**Expected**
- Action does not execute.
- Agent/tool status reflects denial.
- Audit information is recorded.

**Repetition:** Run at least 3–5 times.

**Result:** NOT TESTED

---

## T09 — Action Hash Matches Approved Action

**Objective:** Verify that a valid authorization is bound to the exact action.

**Procedure**
1. Approve action A.
2. Attempt to execute action A with its authorization.
3. Verify execution succeeds.

**Expected**
- Recomputed action hash matches the authorization.
- Execution is allowed.

**Result:** NOT TESTED

---

## T10 — Tampered Action Is Blocked

**Objective:** Mandatory security test.

**Procedure**
1. Create action A.
2. Obtain valid authorization for A.
3. Change the action to B after authorization.
4. Attempt execution using A's authorization.
5. Verify actual system state.

**Expected**
- Execution Gate recomputes the action hash.
- Hash mismatch is detected.
- Modified action is blocked.
- No unauthorized modified action executes.
- Attempt is logged.

**Minimum bar:** PASS is mandatory before final demo.

**Result:** NOT TESTED

---

## T11 — Agent Status Transitions

**Objective:** Verify documented action states.

Test the states:

- `PENDING`
- `APPROVED`
- `DENIED`
- `BLOCKED`
- `EXECUTED`

**Expected**
- State changes accurately reflect the real action outcome.
- A blocked action is not shown as executed.

**Result:** NOT TESTED

---

## T12 — Audit Log Records Execution Attempt

**Objective:** Verify audit information.

**Procedure**
1. Run approved, denied, and blocked test actions.
2. Inspect the audit log.
3. Compare it with the actual test results.

**Expected**
- Relevant attempts are recorded.
- Action/result/timestamp information is accurate for implemented fields.
- Audit state agrees with actual execution state.

**Result:** NOT TESTED

---

# 6. P1 SECURITY / FAILURE TESTS

## T13 — Replay Protection

**Objective:** Verify single-use authorization.

**Procedure**
1. Approve and successfully execute action A.
2. Reuse the same authorization.
3. Attempt execution again.

**Expected**
- First use: allowed.
- Reuse: blocked.
- No unauthorized second execution.

**Result:** NOT TESTED

---

## T14 — Expired Authorization

**Objective:** Verify authorization expiry.

**Procedure**
1. Create/obtain authorization.
2. Allow it to expire according to the configured TTL.
3. Attempt execution.

**Expected**
- Expired authorization is rejected.
- Action does not execute.
- Result is recorded as blocked/expired according to the implementation.

**Result:** NOT TESTED

---

## T15 — Relay Failure / Fail Closed

**Objective:** Verify that loss of relay connectivity cannot cause automatic execution.

**Procedure**
1. Prepare a protected action.
2. Disable/kill the relay connection.
3. Attempt to progress the action.
4. Observe gate behavior.
5. Restore the relay.

**Expected**
- No automatic approval occurs.
- Protected action does not execute without valid authorization.
- System fails safely.
- If polling fallback is implemented, verify it separately after restoring the socket condition.

**Result:** NOT TESTED

---

## T16 — Real-Time Socket Delivery

**Objective:** Verify normal real-time communication.

**Procedure**
1. Trigger `propose_action`.
2. Measure/observe arrival on phone.
3. Approve/deny.
4. Observe laptop resolution.

**Expected**
- Action reaches phone through real-time delivery.
- Decision reaches laptop.
- Document actual measured latency.

**Result:** NOT TESTED

---

## T17 — Socket Drop / Polling Fallback

**Objective:** Verify the documented polling fallback.

**Procedure**
1. Trigger a pending action.
2. Interrupt the socket connection.
3. Use the polling path.
4. Resolve the action.
5. Verify laptop/phone state.

**Expected**
- Polling fallback resolves the action.
- No unsafe automatic execution occurs.

**Result:** NOT TESTED

---

## T18 — AI Provider Failure

**Objective:** Verify that AI failure does not weaken security.

**Procedure**
1. Run with AI explanation provider available.
2. Confirm explanation works.
3. Disable API key/network/provider.
4. Trigger another action.

**Expected**
- Static/deterministic fallback explanation remains available if implemented.
- Human approval remains required.
- AI failure does not authorize an action automatically.

**Result:** NOT TESTED

---

## T19 — Invalid Signature

**Objective:** Verify invalid cryptographic authorization is rejected.

**Procedure**
1. Prepare an otherwise valid action.
2. Supply an invalid/tampered signature using the project's test mechanism.
3. Attempt execution.

**Expected**
- Signature verification fails.
- Execution is blocked.
- Attempt is logged.

**Result:** NOT TESTED

---

## T20 — Authorization for Wrong Action

**Objective:** Verify authorization cannot be transferred between actions.

**Procedure**
1. Authorize action A.
2. Attempt action B with A's authorization.

**Expected**
- Gate detects action mismatch.
- B is blocked.

**Result:** NOT TESTED

---

# 7. PHONE EXPERIENCE TESTS

## T21 — Pending Action UI

Verify:

- [ ] Pending action appears.
- [ ] Exact action details are readable.
- [ ] Risk level is visible.
- [ ] Reason/explanation is visible if implemented.
- [ ] Approve is visible.
- [ ] Deny is visible.
- [ ] Status is understandable.

**Result:** NOT TESTED

---

## T22 — Phone Approve Flow

Verify:

- [ ] Correct action selected.
- [ ] User verification appears.
- [ ] Signing succeeds.
- [ ] Response reaches backend.
- [ ] Gate processes approval.
- [ ] Result appears correctly.

**Result:** NOT TESTED

---

## T23 — Phone Deny Flow

Verify:

- [ ] Deny button works.
- [ ] Denial is sent through the implemented response path.
- [ ] Action does not execute.
- [ ] Result/status updates correctly.

**Result:** NOT TESTED

---

## T24 — Phone History

If implemented:

1. Perform several approve/deny/block actions.
2. Open history.
3. Compare displayed entries against test records.

Expected:
- Correct actions.
- Correct decisions/statuses.
- Correct timestamps for implemented fields.
- No unexpected missing/duplicate entries.

**Result:** NOT TESTED

---

## T25 — Demo-Distance Readability

Using the real iQOO phone/mirrored screen:

- [ ] Risk level readable at demo distance.
- [ ] Action readable.
- [ ] APPROVED/DENIED/BLOCKED state readable.
- [ ] Explanation readable enough for judges.
- [ ] No distracting debug output.

**Result:** NOT TESTED

---

# 8. AI / EXPLANATION TESTS

## T26 — AI Explains Policy Output, Does Not Decide

**Expected architecture**

```text
Action
  ↓
Deterministic Policy
  ↓
Risk + facts
  ↓
Explanation layer
  ↓
Human
  ↓
Authorization
```

Verify that changing an explanation does not itself change authorization.

**Result:** NOT TESTED

---

## T27 — Static Fallback

**Procedure**
1. Disable network/provider.
2. Trigger an action.
3. Observe explanation.

**Expected**
- Static fallback works if implemented.
- Human decision path remains available.

**Result:** NOT TESTED

---

## T28 — Local Model Tier

Only if implemented.

**Procedure**
1. Disable higher-priority AI provider.
2. Trigger an action.
3. Verify local explanation tier responds.

**Expected**
- Local model provides explanation.
- It does not authorize/deny execution.

**Result:** NOT TESTED

---

# 9. CREDENTIAL / SECRET DETECTION TESTS

Only if the feature is implemented.

Test examples documented in the current feature scope:

| Input | Expected |
|---|---|
| `.env` access | Escalated/high-risk warning |
| Private-key path | Escalated/high-risk warning |
| Obvious API-key-like string | Detected |
| Password/secret argument | Detected |

Verify:
- [ ] Detection occurs.
- [ ] Risk is escalated according to implemented policy.
- [ ] Phone warning is specific.
- [ ] Detection does not itself bypass human authorization.

**Result:** NOT TESTED

---

# 10. SMART RISK SCORING TESTS

Only if implemented.

Verify that the risk score/reasoning remains deterministic and that factors documented in the current scope are reflected where supported:

- Target sensitivity
- Reversibility
- Blast radius
- Time/context
- Historical deviation

Example test:

```text
Action:
delete a highly sensitive target

Expected:
higher risk than an equivalent harmless temporary target,
according to the implemented policy rules.
```

Do not invent expected numeric values until the actual implementation defines them.

**Result:** NOT TESTED

---

# 11. OFFICE KIT OPERATIONAL TEST

## T29 — Genuine Red-Light Work

During an official Red Light window:

1. Record the window.
2. Record the actual work performed through Office Kit.
3. Record the relevant commit/change.
4. Record timestamp/evidence.
5. Confirm it was useful work, not staged activity.

Expected:
- At least one genuine useful Red-Light-window contribution is confirmed before final demo preparation.
- Office Kit is treated as a development/demo workflow tool, not as part of the cryptographic authorization protocol.

**Result:** NOT TESTED

---

# 12. END-TO-END TESTS

## T30 — Complete Approve Flow

```text
AI Agent
  ↓
MCP Interceptor
  ↓
Policy
  ↓
Relay
  ↓
Phone
  ↓
Human verification
  ↓
Signed authorization
  ↓
Execution Gate
  ↓
Independent verification
  ↓
Execute
```

Run the complete flow.

**Minimum:** 3 consecutive clean runs.

| Run | Result | Evidence |
|---|---|---|
| 1 | NOT TESTED | |
| 2 | NOT TESTED | |
| 3 | NOT TESTED | |

---

## T31 — Complete Deny Flow

```text
AI Agent
  ↓
MCP Interceptor
  ↓
Policy
  ↓
Phone
  ↓
Human Deny
  ↓
Signed denial
  ↓
Execution Gate
  ↓
BLOCK
```

Run repeatedly.

| Run | Result | Evidence |
|---|---|---|
| 1 | NOT TESTED | |
| 2 | NOT TESTED | |
| 3 | NOT TESTED | |
| 4 | NOT TESTED | |
| 5 | NOT TESTED | |

---

# 13. FAILURE-FIRST MASTER TESTS

These are the five required attack/failure scenarios.

| ID | Scenario | Expected | Result | Timestamp | Evidence |
|---|---|---|---|---|---|
| T10 | Tamper | BLOCK | NOT TESTED | | |
| T13 | Replay | BLOCK | NOT TESTED | | |
| T14 | Expiry | BLOCK | NOT TESTED | | |
| T15 | Relay down | No automatic execution / fail closed | NOT TESTED | | |
| T18 | AI down | Safe fallback; no automatic approval | NOT TESTED | | |

**Minimum security bar:** Tamper test must PASS before the final demo.

---

# 14. DEMO DATA CHECKLIST

Prepare harmless, deterministic demo actions and verify their before/after states.

## Demo Action A — Approve

- [ ] Choose harmless protected action.
- [ ] Record before state.
- [ ] Trigger proposal.
- [ ] Approve on phone.
- [ ] Verify execution.
- [ ] Record after state.

## Demo Action B — Deny

- [ ] Choose harmless protected action.
- [ ] Record before state.
- [ ] Deny on phone.
- [ ] Verify action did not execute.
- [ ] Record after state.

## Demo Action C — Tamper

- [ ] Define action A.
- [ ] Authorize A.
- [ ] Swap A → B.
- [ ] Attempt execution.
- [ ] Verify BLOCK.
- [ ] Capture evidence.

## Demo Action D — Replay

- [ ] Execute once with valid authorization.
- [ ] Reuse authorization.
- [ ] Verify second attempt BLOCK.

## Demo Action E — Expiry

- [ ] Create authorization.
- [ ] Allow expiry.
- [ ] Attempt execution.
- [ ] Verify BLOCK.

---

# 15. REGRESSION RULE

Whenever A or B changes code:

1. Record the commit/change.
2. Identify affected tests.
3. Re-run affected tests.
4. Re-run the relevant P0 security tests.
5. Update this checklist.
6. Record new timestamps.
7. Report failures to the appropriate owner.

### Security-related failure

Report to **A**.

Examples:
- Gate bypass
- Hash mismatch not detected
- Invalid signature accepted
- Replay accepted
- Expiry bypass
- Denied action executed

### Phone/UI-related failure

Report to **B**.

Examples:
- Approve button broken
- Deny button broken
- Wrong action displayed
- History incorrect
- Readability issue

Do not independently modify gate, hashing, relay, or phone components without coordination.

---

# 16. BUG REPORT TEMPLATE

Use this whenever a test fails.

```markdown
# BUG-XXX

## Test
TXX — Test Name

## Severity
CRITICAL / HIGH / MEDIUM / LOW

## Commit
<commit>

## Expected
<expected behavior>

## Actual
<actual behavior>

## Steps to Reproduce
1.
2.
3.

## Evidence
- Screenshot:
- Terminal/log:
- Audit entry:

## Owner
A / B

## Status
OPEN / FIXED / RETESTED
```

### Critical security failures

Treat these as CRITICAL:

- Tampered action executes.
- Denied action executes.
- Invalid signature executes.
- Replayed authorization executes.
- Expired authorization executes.
- Action executes without valid authorization.

---

# 17. TEST EXECUTION RECORD

Use this section during the hackathon.

| Test ID | Date/Time | Commit | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|---|
| T01 | | | | | NOT TESTED | |
| T02 | | | | | NOT TESTED | |
| T03 | | | | | NOT TESTED | |
| T04 | | | | | NOT TESTED | |
| T05 | | | | | NOT TESTED | |
| T06 | | | | | NOT TESTED | |
| T07 | | | | | NOT TESTED | |
| T08 | | | | | NOT TESTED | |
| T09 | | | | | NOT TESTED | |
| T10 | | | | | NOT TESTED | |
| T11 | | | | | NOT TESTED | |
| T12 | | | | | NOT TESTED | |
| T13 | | | | | NOT TESTED | |
| T14 | | | | | NOT TESTED | |
| T15 | | | | | NOT TESTED | |
| T16 | | | | | NOT TESTED | |
| T17 | | | | | NOT TESTED | |
| T18 | | | | | NOT TESTED | |
| T19 | | | | | NOT TESTED | |
| T20 | | | | | NOT TESTED | |
| T21 | | | | | NOT TESTED | |
| T22 | | | | | NOT TESTED | |
| T23 | | | | | NOT TESTED | |
| T24 | | | | | NOT TESTED | |
| T25 | | | | | NOT TESTED | |
| T26 | | | | | NOT TESTED | |
| T27 | | | | | NOT TESTED | |
| T28 | | | | | NOT TESTED | |
| T29 | | | | | NOT TESTED | |
| T30 | | | | | NOT TESTED | |
| T31 | | | | | NOT TESTED | |

---

# 18. CHECKPOINT CHECKLIST

## Checkpoint 1 — Repository Ready

- [ ] All team members can pull the repository.
- [ ] Required packages exist.
- [ ] Relay health check works.
- [ ] Test checklist initialized.

## Checkpoint 2 — Phone Running

- [ ] PWA installed on real iQOO phone.
- [ ] Opens from home screen.
- [ ] Full-screen behavior works.

## Checkpoint 3 — WebAuthn

- [ ] Registration works.
- [ ] Signing works.
- [ ] Server verifies the credential/signature.

## Checkpoint 4 — Execution Gate

- [ ] No-token test blocks.
- [ ] Valid-token test executes.
- [ ] Tampered-token/action test blocks.
- [ ] Audit log populated.

## Checkpoint 5 — End-to-End

- [ ] Full proposal → phone → verification → execution flow works.
- [ ] 3 consecutive clean runs recorded.

## Checkpoint 6 — Security

- [ ] Tamper tested.
- [ ] Replay tested.
- [ ] Expiry tested.
- [ ] Relay failure tested.
- [ ] AI failure tested.
- [ ] Tamper PASS achieved at minimum.

## Checkpoint 7 — AI Explanation

- [ ] Normal explanation works.
- [ ] Static fallback works.
- [ ] AI cannot authorize execution.

## Checkpoint 8 — Final Demo

- [ ] Demo data reset.
- [ ] Approve demo works.
- [ ] Deny demo works.
- [ ] Tamper demo works.
- [ ] Phone readable at demo distance.
- [ ] Real hardware used.
- [ ] Two consecutive clean rehearsals.
- [ ] Both rehearsals within the team's time cap.

---

# 19. FINAL SECURITY CHECKLIST

Before each evaluation round:

- [ ] Protected actions cannot execute without authorization.
- [ ] Valid authorization allows only its exact action.
- [ ] Execution Gate independently verifies authorization.
- [ ] Action hash is recomputed immediately before execution.
- [ ] Tampered action is blocked.
- [ ] Replayed authorization is blocked.
- [ ] Expired authorization is blocked.
- [ ] Denied action is blocked.
- [ ] Invalid signature is blocked.
- [ ] Relay failure does not cause automatic execution.
- [ ] AI failure does not cause automatic approval.
- [ ] Audit information matches actual outcomes.

---

# 20. FINAL DEMO CHECKLIST

## Demo Environment

- [ ] Laptop ready.
- [ ] Real iQOO phone ready.
- [ ] Phone battery/charging ready.
- [ ] Required services running.
- [ ] Network tested.
- [ ] Relay tested.
- [ ] Phone PWA tested.
- [ ] Demo data reset.

## Demo Flow

- [ ] Agent proposes action.
- [ ] Interceptor captures action.
- [ ] Policy classifies it.
- [ ] Phone receives exact action.
- [ ] Human reviews.
- [ ] WebAuthn verification occurs.
- [ ] Gate independently verifies authorization.
- [ ] Approved action executes.
- [ ] Denied action blocks.
- [ ] Tampered action blocks.

## Rehearsals

| Rehearsal | Start | End | Within time cap | Clean |
|---|---|---|---|---|
| 1 | | | [ ] | [ ] |
| 2 | | | [ ] | [ ] |

---

# 21. FINAL QA SIGN-OFF

Do not sign off until the evidence supports the result.

**P0 Security:** PASS / FAIL  
**P1 Failure Tests:** PASS / FAIL  
**Phone Experience:** PASS / FAIL  
**End-to-End:** PASS / FAIL  
**Documentation:** PASS / FAIL  
**Demo Readiness:** PASS / FAIL  
**Fresh Clone:** PASS / FAIL  
**Final Submission Readiness:** PASS / FAIL  

**Person C:** ____________________  
**Date/Time:** ____________________  

---

# 22. IMPORTANT QA RULES

1. Test what actually exists; do not claim planned features are implemented.
2. Verify actual execution state, not only UI messages.
3. Record timestamps and evidence for every executed security test.
4. Re-test after relevant code changes.
5. Report security failures to A and phone/UI failures to B.
6. Do not weaken the security implementation just to make a test pass.
7. If a stretch feature fails, remove the claim rather than faking functionality.
8. Preserve the core invariant: **human decides; Execution Gate independently enforces.**
