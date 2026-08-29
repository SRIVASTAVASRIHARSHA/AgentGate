# HACKATHON_EXECUTION_PLAYBOOK_V3.md

## AgentGate --- Bengaluru City Battle \| 30-Hour Execution Plan

**Technical source of truth:** `TECHNICAL_APPROACH_V2.md`\
**Event source:** official iQOO Hackathon 2026 Bengaluru booklet pages
supplied by the team.

> This is an execution playbook, not another technical architecture
> document. Follow it in order. Any timing not explicitly shown in the
> supplied booklet is **FOLLOW ORGANISER ANNOUNCEMENT**.

------------------------------------------------------------------------

## 1. NON-NEGOTIABLE RULES

-   Build only during the official build window.
-   The iQOO phone is the build surface and demo surface.
-   Green Light = phone + laptop usable.
-   Red Light = iQOO phone only via Office Kit, according to the
    booklet.
-   The core security path must work without a paid AI API.
-   AI explains; it never decides risk or authorization.
-   The Execution Gate independently verifies authorization before
    execution.
-   Do not demonstrate an unrestricted bypass path around AgentGate.
-   Use genuine phone and Office Kit interaction; do not manufacture
    HackTracker activity.
-   Freeze a last-known-good build before evaluations and the final
    demo.
-   If a feature threatens P0, drop the feature rather than the P0 core.

------------------------------------------------------------------------

## 2. OFFICIAL JUDGING TARGET

  ---------------------------------------------------------------------------
  Category                                    Weight What we must demonstrate
  --------------------- ---------------------------- ------------------------
  End Product Quality                            30% Reliable end-to-end
                                                     AgentGate pipeline

  Novelty & Impact                               20% Independent phone
                                                     authorization vs
                                                     same-environment
                                                     confirmation

  Creative Phone Use                             15% Phone as the functional
                                                     security/authorization
                                                     console

  Technical Depth                                15% Action binding,
                                                     independent
                                                     verification,
                                                     tamper/replay/expiry
                                                     defenses

  Office Kit Usage                               10% Genuine Red Light
                                                     workflow through Office
                                                     Kit

  Demo & Presentation                            10% Clean 3--5 minute demo
  ---------------------------------------------------------------------------

**Priority:** P0 core → P1 improvements → P2 only if stable.

------------------------------------------------------------------------

## 3. FINAL PRODUCT FLOW

``` text
AI / Agent
  ↓
MCP Interceptor
  ↓
Deterministic Policy Engine
  ↓
Canonical Action + Hash
  ↓
Relay
  ↓
iQOO Phone
  ↓
Human reviews exact action
  ↓
WebAuthn user verification
  ↓
Signed action-bound authorization
  ↓
Execution Gate
  ↓
Independent hash + signature verification
  ↓
Expiry / single-use / decision checks
  ↓
VALID → EXECUTE
INVALID / DENIED / TAMPERED / REPLAYED / EXPIRED → BLOCK
```

------------------------------------------------------------------------

# 4. BEFORE ENTERING THE VENUE

## GitHub

-   [ ] Repository exists.
-   [ ] All three members have collaborator access.
-   [ ] All three can clone, pull, commit and push.
-   [ ] SSH authentication works.
-   [ ] Git identity is configured.
-   [ ] `main` exists.
-   [ ] Team knows the simple workflow: pull → work → test → commit →
    push.

## Development

-   [ ] Git installed.
-   [ ] Node.js installed.
-   [ ] VS Code/editor ready.
-   [ ] WebAuthn-capable browser ready.
-   [ ] React/Vite basics available.
-   [ ] Node/MCP basics available.
-   [ ] SQLite available.
-   [ ] Socket.IO dependencies known.
-   [ ] Each member can run a basic Node project.

## AI

-   [ ] No paid Anthropic/OpenAI subscription required.
-   [ ] Free-tier accounts available where useful.
-   [ ] Be ready to claim official OpenRouter credits at the event.
-   [ ] API keys stored only in environment variables.
-   [ ] No secrets committed.

## Team

-   [ ] Harsha: Execution Gate, policy, hashing, laptop-side
    verification, security.
-   [ ] Sharook: phone PWA, phone WebAuthn, phone UI, AI provider layer.
-   [ ] Tejaswini: MCP interceptor, relay, agent integration, Office Kit
    workflow, demo environment.

------------------------------------------------------------------------

# 5. AT CHECK-IN

1.  Confirm assigned iQOO loaner phone.
2.  Confirm HackTracker is installed.
3.  Confirm Office Kit is paired.
4.  Attend the organiser teach-in.
5.  Test basic Office Kit functions.
6.  Keep the device in the permitted venue/designated zone.
7.  Do not treat a pre-built application as the event submission.
8.  Wait for the official build window before writing submission code.

------------------------------------------------------------------------

# 6. OFFICIAL RED/GREEN MAP FROM THE SUPPLIED BOOKLET

  -----------------------------------------------------------------------------
  Time                    Status                  Main purpose
  ----------------------- ----------------------- -----------------------------
  Sat 11:00--14:00        🟢 GREEN                Heavy implementation

  Sat 14:00--15:30        🔴 RED                  Phone/Office Kit, testing,
                                                  review

  Sat 15:30--16:30        🟢 GREEN                Heavy implementation

  Sat 16:30--19:00        🔴 RED                  Phone/Office Kit, testing,
                                                  review

  Sat 19:00--00:00        🟢 GREEN                Integration

  Sun 00:00--01:00        🔴 RED                  Testing/review/Office Kit

  Sun 01:00--06:30        🟢 GREEN                Security testing +
                                                  enhancements

  Sun 06:30--09:00        🔴 RED                  Final phone/Office Kit work

  After 09:00             ⚠️ FOLLOW ORGANISER     Evaluation/pitch/submission
                          ANNOUNCEMENT            timing
  -----------------------------------------------------------------------------

**Do not invent additional Red/Green windows.**

------------------------------------------------------------------------

# 7. PHASE 1 --- PROJECT SCAFFOLD

## Sat 11:00--11:30 \| 🟢 GREEN

### Harsha

-   Create core project structure.
-   Create Execution Gate package.
-   Implement default-deny skeleton.
-   Commit.

### Sharook

-   Create React + Vite PWA.
-   Create Pending / Details / Approve / Deny screens.
-   Run locally.

### Tejaswini

-   Create relay package.
-   Create interceptor package.
-   Create `propose_action` skeleton.
-   Create relay health endpoint.

### OUTPUT

Three working development areas and first commit.

### CHECKPOINT

Everyone can run their part locally.

------------------------------------------------------------------------

# 8. PHASE 2 --- PHONE FOUNDATION

## Sat 11:30--13:30 \| 🟢 GREEN

### Sharook

Build: - PWA shell - pending action - risk badge - exact action
details - Approve/Deny controls

### Harsha

Define the action object: - action ID - exact action - risk level -
timestamp - target/context - expiry

### Tejaswini

Connect:

``` text
Laptop test action → relay → phone
```

### OUTPUT

A real test action appears on the phone.

### CHECKPOINT

Phone receives and renders an action correctly.

------------------------------------------------------------------------

# 9. PHASE 3/4 --- WEBAUTHN + EXECUTION GATE

## Sat 13:30--14:00 \| 🟢 GREEN

### Harsha + Sharook

-   Register WebAuthn credential on the iQOO phone.
-   Test signing.
-   Verify the result server-side.

### Harsha

In parallel: - Gate blocks by default. - Valid authorization can pass. -
Missing/invalid authorization blocks.

### Tejaswini

Continue MCP interceptor.

### CHECKPOINT BEFORE RED LIGHT

Know the status of: - WebAuthn registration - WebAuthn signing - Gate
tests - interceptor skeleton

If any is broken, record the exact blocker and fix it in the next
suitable window.

------------------------------------------------------------------------

# 10. RED LIGHT 1

## Sat 14:00--15:30 \| 🔴 RED

### Harsha

-   Review Execution Gate.
-   Review policy rules.
-   Test hashing/security logic through the permitted workflow.
-   Inspect logs.

### Sharook

-   Test phone screens.
-   Test Approve/Deny states.
-   Test WebAuthn UX.
-   Fix phone-side issues.

### Tejaswini

-   Use Office Kit according to organiser rules.
-   Test relay/interceptor workflow.
-   Test permitted remote-control/clipboard/file-transfer workflow.
-   Record blockers.

### OUTPUT

A PASS/FAIL list ready for the next Green Light.

------------------------------------------------------------------------

# 11. PHASE 5 --- ACTION HASH + BINDING

## Sat 15:30--16:30 \| 🟢 GREEN

### Harsha

Implement: - canonical action representation - SHA-256 action hash -
action-bound authorization - exact-action verification at the Gate

### Sharook

-   Display exact action.
-   Initiate authorization.
-   Return signed authorization.

### Tejaswini

Ensure the exact action survives the interceptor/relay path unchanged.

### MANDATORY TEST

``` text
Approve A → execute A → ALLOW
Approve A → substitute B → BLOCK
```

The second test is the core security demonstration.

------------------------------------------------------------------------

# 12. RED LIGHT 2

## Sat 16:30--19:00 \| 🔴 RED

### Harsha

Security review, tests, logs, deny/tamper logic.

### Sharook

Phone UX testing and repeated authorization tests.

### Tejaswini

Office Kit workflow, interceptor testing, agent integration preparation.

### DO NOT

-   Start a major architecture rewrite.
-   Start unrelated features.
-   Waste the window on cosmetic work.

------------------------------------------------------------------------

# 13. PHASE 6 --- MCP + RELAY + AGENT PATH

## Sat 19:00--21:30 \| 🟢 GREEN

### Tejaswini

Implement: - `propose_action` - `check_action_status` - MCP server -
selected agent integration - no alternate protected execution tool

### Harsha

Connect:

``` text
Interceptor → Policy → Hash → Gate
```

### Sharook

Connect:

``` text
Phone → Approve/Deny → authorization → relay
```

### OUTPUT

A real agent request reaches the phone.

------------------------------------------------------------------------

# 14. PHASE 7 --- FIRST COMPLETE RUN

## Sat 21:30--23:30 \| 🟢 GREEN

Run all three together.

### APPROVE TEST

``` text
Agent
→ interceptor
→ policy
→ phone
→ WebAuthn approval
→ relay
→ Execution Gate
→ independent verification
→ execute
```

### DENY TEST

``` text
Agent
→ phone DENY
→ Gate blocks
```

### REPEAT TEST

Run the full approval path three times without manual repair.

### HARD CHECKPOINT

Do not move to feature polish until the core path works repeatedly.

------------------------------------------------------------------------

# 15. RED LIGHT 3

## Sat 23:30--00:00 \| 🔴 RED

-   Run small tests.
-   Review logs.
-   Verify phone connection.
-   Verify Office Kit.
-   Prepare the next Green Light.

Do not begin a major feature.

------------------------------------------------------------------------

# 16. SECURITY TESTING

## Sun 00:00--01:00 \| 🔴 RED

Minimum security tests:

### 1. Deny

Denied action never executes.

### 2. Tamper --- MUST PASS

Approve A, attempt B → blocked.

### 3. Replay

Reuse the same authorization → second attempt blocked.

### 4. Expiry

Expired authorization → blocked.

### Priority if time is short

``` text
Tamper > Deny > Replay > Expiry
```

Never sacrifice the P0 tamper test.

------------------------------------------------------------------------

# 17. PHASE 8 --- SECURITY HARDENING

## Sun 01:00--03:00 \| 🟢 GREEN

### Harsha

Own: - independent signature verification - hash recomputation -
expiry - single-use - fail-closed behavior - audit log

### Tejaswini

Own: - interceptor robustness - relay failure behavior - agent response
after denial - no-bypass path

### Sharook

Own: - phone authorization reliability - WebAuthn behavior - exact
action display - error states

### FAILURE TESTS

``` text
No authorization → BLOCK
Wrong authorization → BLOCK
Tampered action → BLOCK
Replayed authorization → BLOCK
Expired authorization → BLOCK
Relay failure → NO AUTO-APPROVE
AI failure → approval still works
```

------------------------------------------------------------------------

# 18. PHASE 9 --- AI EXPLANATION

## Sun 03:00--04:30 \| 🟢 GREEN

AI remains explanatory only.

### LEVEL 1 --- GUARANTEED BASELINE

Static explanation keyed to the deterministic policy result.

Must work with: - no network - no API - no model

### LEVEL 2 --- LOCAL/OPEN-SOURCE

Attempt only after P0 is stable.

Fallback to static.

### LEVEL 3 --- EVENT AI CREDITS

Use OpenRouter/Gemini/event-provided credits only if useful.

Do not let AI integration block the product.

### DONE

Phone displays a useful explanation while approval remains functional
when AI is unavailable.

------------------------------------------------------------------------

# 19. PHASE 10 --- CREATIVE PHONE USE

## Sun 04:30--05:30 \| 🟢 GREEN

Prioritize:

1.  Live pending-action feed.
2.  Risk badge.
3.  Full action detail.
4.  Approve/Deny.
5.  WebAuthn verification.
6.  History/audit view.
7.  AI explanation if already stable.

Do not build unnecessary animations/settings/features.

The phone must be a functional security console.

------------------------------------------------------------------------

# 20. PHASE 11 --- OFFICE KIT WORKFLOW

## Sun 05:30--06:30 \| 🟢 GREEN

### Tejaswini

Verify the Office Kit workflow: - mirroring - remote control -
clipboard - file transfer where useful

### All

Perform a genuine workflow consistent with the event rules.

### OUTPUT

The team can explain and demonstrate how AgentGate was developed/used
under the phone-first constraints.

------------------------------------------------------------------------

# 21. FINAL RED LIGHT

## Sun 06:30--09:00 \| 🔴 RED

No major new features.

### Harsha

-   Run security tests.
-   Inspect audit trail.
-   Freeze architecture.

### Sharook

-   Final phone fixes.
-   WebAuthn test.
-   Approve/Deny test.
-   History/detail test.

### Tejaswini

-   Office Kit.
-   Agent/interceptor check.
-   Demo environment.
-   Verify no bypass.

### FINAL QUESTION

``` text
Can we demonstrate the core product using the phone?
```

YES → stabilize.\
NO → fix only the smallest blocker.

------------------------------------------------------------------------

# 22. AFTER 09:00

The supplied booklet does not provide enough information to invent an
exact schedule here.

**FOLLOW ORGANISER ANNOUNCEMENT.**

When the next stage is announced:

1.  Freeze a known-good commit.
2.  Run Approve.
3.  Run Deny.
4.  Run Tamper.
5.  Run Replay/Expiry if implemented.
6.  Run the complete demo twice.
7.  Do not introduce risky architecture changes.

------------------------------------------------------------------------

# 23. EVALUATION PREPARATION

Before each evaluation:

## PRODUCT

-   [ ] Full pipeline works.
-   [ ] No manual repair between runs.
-   [ ] Real iQOO phone works.

## SECURITY

-   [ ] WebAuthn works.
-   [ ] Exact-action binding works.
-   [ ] Independent verification works.
-   [ ] Deny works.
-   [ ] Tamper works.
-   [ ] Replay/expiry work if implemented.
-   [ ] Fail-closed behavior works.

## PHONE

-   [ ] Pending action visible.
-   [ ] Risk visible.
-   [ ] Exact action visible.
-   [ ] Approve/Deny obvious.
-   [ ] History works if included.

## OFFICE KIT

-   [ ] Actual workflow tested.

## AI

-   [ ] Static fallback works.
-   [ ] No paid API is required.
-   [ ] Any model actually used is disclosed accurately.
-   [ ] AI does not authorize anything.

------------------------------------------------------------------------

# 24. LAST-KNOWN-GOOD RULE

Before every evaluation/demo:

``` text
CURRENT BUILD
↓
FULL TEST
↓
PASS → record/tag as LAST-KNOWN-GOOD
FAIL → fix/revert
```

After the last-known-good build passes:

**No risky refactoring.**

------------------------------------------------------------------------

# 25. FINAL 3--5 MINUTE DEMO

## 0:00--0:30 --- PROBLEM

Show an AI agent proposing a risky action.

## 0:30--1:00 --- INTERCEPTION

Show: - exact action - policy result - risk

## 1:00--1:45 --- PHONE AUTHORIZATION

Show the iQOO phone: - exact action - risk - explanation - Approve/Deny

Approve using WebAuthn user verification.

## 1:45--2:15 --- ENFORCEMENT

Show the Execution Gate independently verifying: - action hash -
signature - expiry - single-use

Then execute.

## 2:15--2:45 --- DENY

Send another risky action.

Press Deny.

Show that it does not execute.

## 2:45--3:30 --- WOW MOMENT: TAMPER

Approve A.

Substitute B before execution.

Gate recomputes the hash.

``` text
BLOCKED
```

Message:

> An approval for one action cannot authorize a different action.

## 3:30--4:00 --- PHONE HISTORY

Show the actual audit/history.

## 4:00--4:30 --- CLOSE

> **The AI can propose an action, but it cannot authorize its own
> execution.**

If time is shorter, cut history first---not the tamper demonstration.

------------------------------------------------------------------------

# 26. TEAM OWNERSHIP

## HARSHА

Primary: - Execution Gate - action hashing - policy - laptop-side
WebAuthn verification - audit - tamper/replay/expiry - security
integrity

**Do not abandon the security spine for UI polish.**

## SHAROOK

Primary: - phone PWA - phone WebAuthn - phone UI - action detail -
history - AI explanation layer

**Keep the phone stable. Do not rewrite as native Android.**

## TEJASWINI

Primary: - MCP interceptor - relay - agent integration - Office Kit
workflow - demo environment

**Keep the agent-to-AgentGate path simple and demonstrable.**

------------------------------------------------------------------------

# 27. SIMPLE GIT WORKFLOW

``` text
git pull
↓
make one logical change
↓
test
↓
git add .
↓
git commit
↓
git push
```

Before stable milestones:

``` text
commit → push → record commit as known-good
```

Do not introduce experimental work into the stable build immediately
before evaluation.

------------------------------------------------------------------------

# 28. SCOPE CUT ORDER

If behind schedule, cut:

1.  Voice/TTS.
2.  Snapdragon NPU experimentation.
3.  Cloud AI enhancements.
4.  Local-model enhancements.
5.  Advanced UI polish.
6.  Extra audit visualizations.

Never cut:

1.  Phone approval.
2.  WebAuthn.
3.  Action hashing.
4.  Independent Gate verification.
5.  Deny.
6.  Tamper.
7.  Core end-to-end execution.

------------------------------------------------------------------------

# 29. FINAL SUBMISSION CHECKLIST

## CORE

-   [ ] Agent proposes.
-   [ ] Interceptor captures.
-   [ ] Policy evaluates.
-   [ ] Phone receives.
-   [ ] Human approves/denies.
-   [ ] WebAuthn signs.
-   [ ] Gate independently verifies.
-   [ ] Valid approval executes.
-   [ ] Denial blocks.
-   [ ] Tamper blocks.

## PHONE

-   [ ] Runs on iQOO loaner.
-   [ ] Pending actions work.
-   [ ] Risk visible.
-   [ ] Exact action visible.
-   [ ] Approve/Deny works.
-   [ ] WebAuthn works.
-   [ ] History works if included.

## SECURITY

-   [ ] Hash recomputation.
-   [ ] Signature verification.
-   [ ] Expiry.
-   [ ] Single-use.
-   [ ] Tamper.
-   [ ] Replay if implemented.
-   [ ] Fail-closed.

## AI

-   [ ] Static fallback works.
-   [ ] No paid API required.
-   [ ] Any model actually used is disclosed accurately.
-   [ ] AI never authorizes.

## OFFICE KIT

-   [ ] Genuine Red Light workflow completed.
-   [ ] Phone remains a real part of the product.
-   [ ] No fake HackTracker activity.

## DEMO

-   [ ] Two consecutive successful runs.
-   [ ] Under 5 minutes.
-   [ ] Real iQOO phone.
-   [ ] Deny ready.
-   [ ] Tamper ready.
-   [ ] Last-known-good commit identified.

## SUBMISSION

-   [ ] Repo pushed before hard cutoff.
-   [ ] Demo assets ready.
-   [ ] Submission requirements checked against organiser instructions.
-   [ ] No secrets committed.
-   [ ] No unsupported claims.

------------------------------------------------------------------------

# 30. ONE-PAGE MENTAL MAP

``` text
BEFORE EVENT
↓
Git + tools + accounts + docs
↓
SAT 11:00 🟢
SCAFFOLD
↓
PHONE FOUNDATION
↓
SAT 14:00 🔴
TEST + OFFICE KIT
↓
SAT 15:30 🟢
WEBAUTHN + HASH + EXECUTION GATE
↓
SAT 16:30 🔴
TEST + REVIEW
↓
SAT 19:00 🟢
MCP + RELAY + INTEGRATION
↓
SAT 23:30 / SUN 00:00 🔴
DENY + TAMPER + REPLAY + EXPIRY
↓
SUN 01:00 🟢
SECURITY HARDENING
↓
AI / PHONE FEATURES
ONLY AFTER P0
↓
SUN 06:30 🔴
FINAL PHONE-FIRST TESTING
↓
SUN 09:00
FOLLOW ORGANISER ANNOUNCEMENT
↓
EVALUATION / PITCH / SUBMISSION
↓
FINAL DEMO
PHONE + REAL AUTHORIZATION + INDEPENDENT ENFORCEMENT
```

------------------------------------------------------------------------

# 31. DEFINITION OF SUCCESS

The judge must be able to see:

``` text
AI proposes something risky
↓
AgentGate intercepts it
↓
Phone shows exactly what will happen
↓
Human authorizes on phone
↓
Execution Gate independently verifies it
↓
Action executes
```

Then:

``` text
Approve A
↓
Change A to B
↓
Gate detects mismatch
↓
BLOCK
```

That is the core proof that AgentGate is an enforcement mechanism rather
than another confirmation dialog.

------------------------------------------------------------------------

# 32. FINAL RULE

**Build the smallest system that makes the security claim undeniable on
the iQOO phone.**

Everything else is optional.
