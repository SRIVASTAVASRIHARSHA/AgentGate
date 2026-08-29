# TEAM_EXECUTION_PLAN_FINAL.md — Agent Gate
### iQOO Hackathon 2026 — Team IQOONIC


## OFFICIAL RED/GREEN WINDOWS — BENGALURU

Use these windows from the supplied event guide. If organisers announce a change,
the live organiser announcement takes precedence.

| Time | Status | Team focus |
|---|---|---|
| Sat 11:00–14:00 | 🟢 GREEN | Phone + laptop implementation |
| Sat 14:00–15:30 | 🔴 RED | Phone/Office Kit work, testing, review |
| Sat 15:30–16:30 | 🟢 GREEN | Phone + laptop implementation |
| Sat 16:30–19:00 | 🔴 RED | Phone/Office Kit work, testing, review |
| Sat 19:00–00:00 | 🟢 GREEN | Integration |
| Sun 00:00–01:00 | 🔴 RED | Phone/Office Kit work, testing, review |
| Sun 01:00–06:30 | 🟢 GREEN | Security testing and enhancements |
| Sun 06:30–09:00 | 🔴 RED | Final phone/Office Kit work and stabilization |

Source of truth: `TECHNICAL_APPROACH_V2.md` only.

---

# 1. TEAM OPERATING MODEL

AgentGate is built through three coordinated workstreams that converge into one end-to-end system:

- **A (Sri Harsha) → Core Security & System Integration** — the execution gate, cryptographic verification, action hashing, agent/relay integration, and the security guarantees the whole product is built on.
- **B (Sharook) → Phone Experience & AI Layer** — everything the judges and the agent's human authorizer see and touch on the iQOO phone, plus the explanation layer.
- **C (Tejaswini) → Testing, Documentation & Demo Operations** — proving the system works under attack and failure, keeping the team's docs and demo assets accurate and ready, and owning the operational readiness of every checkpoint and the final demo.

Each stream owns a real, necessary slice of the product. None of the three is optional: A's gate has nothing to protect without B's phone, B's phone has nothing to approve without A's gate, and neither is provably trustworthy without C's tests. They meet at Phase 8 (first full end-to-end run) and again at every checkpoint after.

---

# 2. PERSON A — SRI HARSHA
## Core Security & System Integration

### Task A1 — Repository & Environment
**Do:** Stand up `mcp-interceptor/`, `relay-server/`, `phone-pwa/` packages; push first commit inside the event window; deploy relay skeleton.
**Output:** 3 runnable packages, relay with a public URL.
**Done when:** All 3 people `git pull` successfully; relay `GET /health` responds.
**Depends on:** Phase 0 environment prep (all three people).
**Test:** `git pull` on all machines; relay health check.

### Task A2 — WebAuthn Server-Side Verification
**Do:** Build `/register-options`, `/register-verify`, `/auth-options`, `/auth-verify` on relay-server using `@simplewebauthn/server`; verify independently, never trust a library return value alone.
**Output:** Working registration/signing endpoints backing B's phone-side flow.
**Done when:** Registration and signing round-trip against the real iQOO phone, server confirms `verified: true`.
**Depends on:** B's phone-side WebAuthn calls (Task B2) to test against.
**Test:** Register + sign on the actual iQOO phone; confirm server verification.

### Task A3 — Execution Gate
**Do:** Build `executionGate.ts` — refuses execution by default, independently re-verifies the signature against the cached public key (never trusts relay's "verified" flag), logs every attempt to SQLite.
**Output:** Gate that blocks with no token, allows with a valid token, blocks a tampered token.
**Done when:** All 3 gate tests pass (no token / valid / tampered) and every attempt is in the audit log.
**Depends on:** Nothing — this is the first piece of the security core.
**Test:** Run the no-token, valid-token, tampered-token cases; confirm audit log entries.

### Task A4 — Action Hashing & Authorization Binding
**Do:** Implement `hashing.ts` (`SHA256` over canonical action JSON); bind `action_hash` into the WebAuthn challenge; recompute the hash in the gate immediately before execution and reject on mismatch.
**Output:** Tokens bound to the exact command, not just to "approved."
**Done when:** Swapped-command test rejected; matched-command test allowed.
**Depends on:** Task A3 (gate must exist), coordinates with B on the challenge payload shape.
**Test:** Approve command A, attempt to execute command B with A's token → rejected. Approve and execute A with its own token → allowed.

### Task A5 — MCP Interceptor & Agent Integration
**Do:** Build the MCP server exposing `propose_action` / `check_action_status`; wire it into the pending-action store; configure the demo agent with only this MCP server available (no raw shell tool alongside it); write the system instruction directing risky actions through `propose_action`.
**Output:** Agent that proposes instead of executes.
**Done when:** A natural-language risky request reliably triggers `propose_action`, with no bypass tool present.
**Depends on:** Task A1 (packages exist).
**Test:** Ask the agent to do something risky; confirm it calls `propose_action` and has no alternate execution path.

### Task A6 — Relay Real-Time Communication (build)
**Do:** Build `POST /actions`, `action:new` push to phone, `POST /actions/:id/respond`, `action:resolved` push to laptop, and the 2s REST polling fallback for both directions.
**Output:** Action reaches the phone in real time; decision reaches the laptop in real time; both survive a socket drop.
**Done when:** Round trip under 2s; socket-kill test still resolves via polling within ~4s.
**Depends on:** Task A5 (actions being proposed), B's phone client (Task B3) consuming the push.
**Test:** Trigger `propose_action`, confirm phone update <2s; approve, confirm laptop resolution <2s; kill socket, confirm polling fallback.

### Task A7 — First End-to-End Integration
**Do:** Wire agent → MCP → relay → phone → WebAuthn sign → relay → gate → execute into one real run, using one hardcoded risky command. Fix only integration glue.
**Output:** One full, repeatable real round trip.
**Done when:** The full flow runs 3x in a row without manual intervention.
**Depends on:** A3–A6 individually done, plus B's phone UI and WebAuthn signing (B1–B3).
**Test:** Ask-agent → phone alert → biometric approve → real command executes, visible in terminal, repeated 3x.

### Task A8 — Deny Path (Gate Side)
**Do:** Accept a signed `decision: "deny"` payload bound to `action_id`; refuse execution and log it; have `check_action_status` return `denied` so the agent's tool result reflects the denial.
**Output:** Denial that is cryptographically real, not a UI state.
**Done when:** Command provably does not run; agent's next message reflects being told to stop/re-plan.
**Depends on:** Task A7 (integration must exist), B's Deny button (Task B4).
**Test:** Trigger a risky action, deny on phone, confirm no execution and confirm agent reaction.

### Task A9 — Tamper / Replay / Expiry / Failure Enforcement
**Do:** Add nonce-consumption tracking for replay detection; add TTL auto-resolve-to-blocked for expiry; confirm fail-closed behavior when relay or AI provider is killed. Drive the live tests; script each so they're repeatable.
**Output:** Working replay, expiry, and fail-closed behavior in code, plus scripts C can run to test them.
**Done when:** All 5 attack/failure scenarios (tamper, replay, expiry, relay-down, AI-down) pass, each with a repeatable script.
**Depends on:** Task A4 (hashing/binding must exist).
**Test:** Run each of the 5 scenarios; record pass/fail (C executes these using A's scripts — see Task C-series).

### Task A10 — Critical Debugging & Final Security Validation
**Do:** Own any P0 breakage across the pipeline; protect Phase 4/5/8's time budget from being compressed by other work; do the final pass confirming the security claim holds under the Final Execution Checklist's SECURITY section.
**Output:** A pipeline that has never had its core enforcement path weakened to hit a deadline.
**Done when:** Tamper, replay, expiry, and fail-closed checklist items are all checked off going into each evaluation round.
**Depends on:** All prior A tasks.
**Test:** Re-run Phase 10's 5 scenarios before Round 1 and again before Round 2.

**What B and C depend on from A:** working WebAuthn endpoints, a working gate, a working relay, a working MCP interceptor, and the interfaces (challenge payload shape, action/response schema) those expose.

---

# 3. PERSON B — SHAROOK
## Phone Experience & AI Layer

### Task B1 — Phone PWA Skeleton
**Do:** Scaffold the React + Vite PWA in `phone-pwa/`; add manifest + service worker; deploy to a static host; install to the iQOO loaner phone's home screen.
**Output:** A blank installable "Agent Gate" app on the actual iQOO phone.
**Done when:** It opens full-screen from the home screen icon, no browser chrome.
**Depends on:** A's Task A1 (repo/packages exist).
**Test:** Launch from the home screen icon on the real iQOO phone.

### Task B2 — WebAuthn Phone-Side
**Do:** Add `@simplewebauthn/browser`; wire a "Register Device" button (`/register-options` → `/register-verify`) and a "Sign Test Challenge" button (`/auth-options` → biometric prompt → `/auth-verify`), tested on the real iQOO phone.
**Output:** Real biometric registration and signing from the phone.
**Done when:** Both flows succeed on the actual iQOO phone and the server confirms verification.
**Depends on:** A's Task A2 (server endpoints).
**Test:** Tap Register → biometric prompt → success. Tap Sign Test Challenge → biometric prompt → server verified.

### Task B3 — Pending Action Feed & Approve/Deny
**Do:** Subscribe to `action:new` and render the pending list (turning B1's placeholder into the real screen); on decision, `POST /actions/:id/respond` with the signed token from B2/A4's flow; add the REST polling fallback client-side.
**Output:** Live pending-action list with working Approve on the phone.
**Done when:** A proposed action appears on phone within 2s and an approval reaches the laptop within 2s, including via polling if sockets drop.
**Depends on:** A's Task A6 (relay push/respond endpoints).
**Test:** Trigger a proposal on the laptop, confirm it lands on phone; approve, confirm laptop resolution.

### Task B4 — Deny Button
**Do:** Add "Deny," signing a `decision: "deny"` payload still bound to `action_id`, using the same real signature flow as Approve.
**Output:** A genuinely cryptographic deny action.
**Done when:** Denying on phone results in the command provably not running (validated jointly with A's Task A8).
**Depends on:** Task B3, A's Task A8.
**Test:** Deny a proposed action; confirm no execution and confirm the agent's response reflects it.

### Task B5 — Risk Badge, Action Detail & History Screen
**Do:** Render LOW/MED/HIGH risk natively (not just text); build a detail view showing full command/target; build the audit/history screen querying relay/SQLite for past actions (risk level, decision, timestamp), on-phone only.
**Output:** Phone-native risk display, detail view, and history screen.
**Done when:** History screen shows real past actions after a few approve/deny cycles; detail view shows full command context.
**Depends on:** A's audit log (Task A3) for data to display.
**Test:** Approve/deny a few actions, open history, confirm accuracy.

### Task B6 — AI Explanation Layer
**Do:** Build `getExplanation(action, riskLevel)` with a P0 static-template tier (always works, zero network) first, then wire a P1 Gemini free-tier call that falls back to the static tier on error/timeout. Render whichever tier answered with a small "via: static / Gemini / local" label.
**Output:** Dynamic phone-side explanation text with a guaranteed offline fallback.
**Done when:** Gemini responds normally when available; killing network/API key still shows the static fallback with approval unaffected.
**Depends on:** Task B3 (phone rendering pipeline exists).
**Test:** Normal run shows Gemini text; network/key killed shows static fallback.

### Task B7 — Local/Open-Source Model Tier (if core is stable)
**Do:** Once P0/P1 above are solid, add a local Ollama-based tier behind the same `getExplanation` interface as a fallback after Gemini; add a way to demonstrate the fallback chain live (e.g. disabling the Gemini key).
**Output:** A third, local explanation tier.
**Done when:** Disabling Gemini causes the local tier to answer instead of falling straight to static.
**Depends on:** Task B6 being stable; only attempt if P0–P1 phone work is done.
**Test:** Disable Gemini key, confirm local model tier responds.

### Task B8 — Voice Read-Out (if time remains)
**Do:** Add text-to-speech read-out of the explanation using the phone browser's built-in `SpeechSynthesis` API.
**Output:** Optional "read aloud" on the explanation panel.
**Done when:** Tapping "read aloud" speaks the explanation on the actual phone.
**Depends on:** Task B6.
**Test:** Trigger read-aloud, confirm audio.

### Task B9 — Phone UX Polish
**Do:** Increase font sizes for risk level/explanation for readability at demo distance; apply clear color coding (LOW/MED/HIGH, APPROVED/DENIED/BLOCKED); remove debug console noise.
**Output:** Phone UI that reads clearly from across a room on a mirrored screen.
**Done when:** Viewing the mirrored phone from across a room, risk level and decision state are readable at a glance.
**Depends on:** B3–B6 functionally done.
**Test:** View the mirrored phone screen from across a room.

**What B needs from A/C:** working WebAuthn server endpoints (A2), relay push/respond endpoints (A6), the audit log to query (A3), and C's test results to know which phone flows are confirmed solid before demo rehearsal.

**Note for B:** where AI/vibe-coding tools are used to speed up implementation, read and understand the generated code before integrating it — you're the one who has to explain and debug it live during evaluation and demo.

---

# 4. PERSON C — TEJASWINI
## Testing, Documentation & Demo Operations

### Task C1 — Test Checklist Ownership
**Action:** Maintain the running test checklist covering every scenario in the Failure-First Table and Phase 10 (tamper, replay, expiry, relay-down, AI-down), plus Approve/Deny happy paths.
**Output:** A single up-to-date checklist with pass/fail status and timestamps.
**Done when:** Every scenario has a recorded pass/fail before each evaluation round.
**Reports to:** A for anything security-related that fails; B for anything phone-UI-related that fails.
**Do not modify without coordination:** gate logic, hashing logic, relay endpoints, phone components — report and let A/B fix.

### Task C2 — Executing the Attack/Failure Test Scripts
**Action:** Using A's repeatable scripts (Task A9), run the tamper test, replay test, expiry test, relay-kill test, and AI-provider-kill test.
**Output:** Recorded pass/fail for each of the 5 scenarios.
**Done when:** All 5 have a result, with tamper passing as the non-negotiable minimum bar.
**Reports to:** A.
**Do not modify without coordination:** the scripts themselves — flag issues rather than editing gate/hash code directly.

### Task C3 — Deny Path Verification
**Action:** Run the deny flow (Task A8/B4) repeatedly; confirm the command genuinely does not execute and that the agent's next response reflects the denial.
**Output:** Confirmed, reproducible deny behavior.
**Done when:** Deny reliably blocks execution across repeated runs.
**Reports to:** A (gate behavior) and B (phone Deny button) as relevant.

### Task C4 — Office Kit Operational Checks
**Action:** During each Red Light window, confirm the Office Kit workflow (screen mirroring, remote control, clipboard, file transfer) is actually being used for real work — not staged — and that at least one real commit is made this way.
**Output:** A record of genuine Office Kit-driven work (e.g. commit timestamps during Red Light).
**Done when:** At least one real, useful Red Light-window contribution is confirmed before final demo prep.
**Reports to:** Whoever is on the Office Kit shift that window (rotates per Phase 14).

### Task C5 — Demo Test Data & Repeatable Scenarios
**Action:** Prepare the exact demo actions (e.g. "delete the old backups folder," "push to main") and any before/after state needed to prove blocking (e.g. `ls` showing a file still present after a deny).
**Output:** A ready, repeatable demo dataset/script matching the Demo Build sequence in TECHNICAL_APPROACH_V2.md.
**Done when:** The same demo sequence can be run repeatedly with predictable, provable results.
**Reports to:** A + B jointly during rehearsal (Phase 19).

### Task C6 — Documentation Maintenance
**Action:** Keep setup/run instructions and implementation documentation accurate as the system evolves; do not invent content — document what actually exists and works.
**Output:** Accurate, current docs matching the real state of the repo.
**Done when:** Docs match the codebase at each checkpoint (Phase 16, 17, 20).
**Reports to:** A + B for accuracy checks on their respective components.

### Task C7 — Demo & Submission Checklist
**Action:** Own the Final Execution Checklist items under DEMO and SUBMISSION; confirm phone/laptop demo environment is ready before each evaluation round and the final demo; assist with the Phase 20 fresh-clone verification.
**Output:** A completed, verified checklist before each checkpoint and before submission.
**Done when:** Fresh-clone test passes and all demo assets are attached before the cutoff.
**Reports to:** C submits verification results to A (who owns Phase 20 final push) and B.

**What C needs from A/B:** A's test scripts (A9) and B's stable phone build to test against; without those, C's testing work has nothing to run against.

---

# 5. SHARED DEPENDENCIES

```
A builds Execution Gate + WebAuthn verification (A2, A3)
        ↓
B connects phone authorization experience (B2, B3, B4)
        ↓
C tests the complete approve/deny/attack flow (C1–C3)
```

```
A exposes relay push/respond interface (A6) + MCP interceptor (A5)
        ↓
B consumes it in the phone client (B3)
        ↓
C validates real-time behavior and failure fallback (C1, C2)
```

```
A's audit log (A3)
        ↓
B's history screen (B5) reads from it
        ↓
C confirms history accuracy against real test runs (C1)
```

Parallel work: A5 (MCP) can run alongside A2–A4 (WebAuthn/gate/hashing). B1 (phone skeleton) can start as soon as A1 is done, in parallel with A2–A5. C1 (checklist setup) can start immediately and run throughout — C's active testing (C2, C3) begins once A7 (first integration) exists.

Convergence points: Phase 8 (first full end-to-end run — A+B+C together), Phase 10 (attack testing — A drives, B+C support), Phase 16/17 (evaluation prep — all three).

---

# 6. PARALLEL WORK PLAN

| Phase | A — Sri Harsha | B — Sharook | C — Tejaswini | Dependency |
|---|---|---|---|---|
| Phase 0 | Env setup, WebAuthn verification docs | Env setup, MCP/Socket.IO docs | Env setup, docs, test-checklist template drafted | None |
| Phase 1 | Repo structure, relay deployed (A1) | Follows repo setup | Sets up test checklist skeleton against Phase 10 scenarios | Phase 0 |
| Phase 2 | Supports as needed | Phone PWA skeleton, installed on iQOO (B1) | Prepares demo test data drafts | Phase 1 |
| Phase 3 | WebAuthn server verification (A2) | WebAuthn phone-side register/sign (B2) | Observes/logs first WebAuthn test results | Phase 2 |
| Phase 4 | Execution Gate (A3) | Continues B2/B1 polish | Drafts gate test cases for later execution | Phase 3 |
| Phase 5 | Action hashing/binding (A4) | — | Drafts hash-mismatch test case | Phase 4 |
| Phase 6 | MCP interceptor/agent integration (A5) | — | Drafts agent-bypass test case | Phase 1 (parallel with 3–5) |
| Phase 7 | Relay real-time comms (A6) | Phone pending list + respond client (B3) | Drafts real-time/polling-fallback test case | Phase 2, Phase 6 |
| Phase 8 | First end-to-end integration (A7) | First end-to-end integration (A7, phone side) | Observes first full run, logs result | A3,A4,A5,A6 + B1,B2,B3 |
| Phase 9 | Deny path, gate side (A8) | Deny button (B4) | Executes deny verification (C3) | Phase 8 |
| Phase 10 | Drives tamper/replay/expiry/failure enforcement (A9) | Supports if needed | Executes all 5 scenarios, records results (C2) | Phase 9 |
| Phase 11 | Supports if needed | AI explanation, static + Gemini (B6) | Tests fallback behavior (network killed) | Phase 8 |
| Phase 12 | Supports if needed | Local model tier (B7), if time allows | Tests fallback chain | Phase 11 |
| Phase 13 | Supports if needed | Detail view, history screen, voice (B5, B8) | Tests history accuracy (C1) | Phase 8, Phase 11 |
| Phase 14 | Rotates onto Office Kit shift as scheduled | Rotates onto Office Kit shift as scheduled | Confirms real Office Kit-driven work happened (C4) | Ongoing, per Red Light |
| Phase 15 | Terminal output readability | Phone UX polish (B9) | Verifies readability at demo distance | Phase 8,9,10,11,13 |
| Phase 16 | Full run-through, security validation (A10) | Full run-through, phone stability | Runs eval-round checklist (C7) | Phase 8,9,10 |
| Phase 17 | Re-verify P0/P1 post-feedback | Re-verify phone stability | Re-runs full checklist (C7) | Phase 16 |
| Phase 18 | Supports pitch prep | Supports pitch prep | Supports pitch prep / demo data readiness | Phase 17 |
| Phase 19 | Final rehearsal, security path | Final rehearsal, phone path | Prepares/verifies demo scenario data (C5) | Phase 18 |
| Phase 20 | Final push, fresh-clone verification | Verifies fresh clone | Assists submission checklist (C7) | Phase 19 |

Milestone that brings everyone back together: **Phase 8** (first full end-to-end run), and again at **Phase 16 / Phase 17** (evaluation prep) and **Phase 19** (final rehearsal).

---

# 7. 30-HOUR HACKATHON EXECUTION

### BEFORE CLOCK START
- **A:** dev environment, WebAuthn verification library docs, architecture familiarity with this plan.
- **B:** dev environment, MCP quickstart, WebAuthn `navigator.credentials` docs, Socket.IO quickstart.
- **C:** dev environment, same 3 core docs at a working-familiarity level, plus setting up the test-checklist template and demo-data draft.

### GREEN LIGHT (both devices usable)
- **A:** repo/relay setup, WebAuthn server verification, Execution Gate, action hashing, MCP interceptor, relay real-time comms, integration, deny-path gate logic, security enforcement work, final security validation.
- **B:** phone PWA build, WebAuthn phone-side, pending list/approve/deny UI, detail view, history screen, AI explanation layer, local model tier, voice, UX polish.
- **C:** test checklist setup, executing test scenarios as they become available, demo data preparation, documentation updates, checklist/submission verification.

### RED LIGHT (iQOO phone only, via Office Kit)
- **A:** use screen mirroring + remote control to continue security/gate/hashing work, run test scripts, review code, adjust `policy.rules.json`, git operations from the phone.
- **B:** use Office Kit for tasks that tolerate phone-driven remote work (code review, small edits, docs); avoid starting new UI/CSS work until Green Light.
- **C:** verify Office Kit-driven work is genuinely happening (Task C4); use Red Light windows for documentation, running test scripts, and checklist maintenance — tasks that don't need heavy remote-control typing.
- **Expected combined output:** at least one real commit made through Office Kit before final demo prep, confirmed by C.

Exact Red Light/Green Light windows: use the official Red/Green windows below; if organisers announce a change,
the live organiser announcement takes precedence, per TECHNICAL_APPROACH_V2.md.

---

# 8. MILESTONE CHECKPOINTS

## CHECKPOINT 1 — Repository Ready
A → repo + packages + relay URL (A1)
B → clones and runs locally
C → confirms `git pull` works for all three, relay health check passes
Expected state → 3 packages exist and run, relay reachable

## CHECKPOINT 2 — Phone Running
A → supports as needed
B → PWA installed on the actual iQOO loaner phone (B1)
C → confirms app opens full-screen from home screen
Expected state → installable app running on real hardware

## CHECKPOINT 3 — WebAuthn Working
A → server verification endpoints (A2)
B → phone-side register/sign (B2)
C → confirms register + sign succeed on the iQOO phone with server-verified result
Expected state → real signed challenge, verified

## CHECKPOINT 4 — Execution Gate Working
A → gate blocks by default, allows on valid token, blocks on tampered token (A3)
B → not applicable at this checkpoint
C → runs the 3 gate tests, records results
Expected state → gate tests pass, audit log populated

## CHECKPOINT 5 — End-to-End Flow
A → full pipeline wired (A7)
B → phone side of the pipeline confirmed (B2, B3)
C → observes and logs 3 consecutive clean runs
Expected state → propose → phone → biometric approve → verified execute, repeatable

## CHECKPOINT 6 — Security Attack Tests
A → tamper/replay/expiry/fail-closed logic + scripts (A9)
B → confirms phone unaffected by AI-provider failure
C → executes all 5 scenarios, records pass/fail (C2)
Expected state → tamper passes at minimum; all 5 scripted and recorded

## CHECKPOINT 7 — AI Explanation
A → not applicable
B → static + Gemini tiers working with safe fallback (B6)
C → tests fallback behavior with network/key killed
Expected state → dynamic explanation with zero-network fallback confirmed

## CHECKPOINT 8 — Final Demo
A → security path rehearsed clean
B → phone path rehearsed clean
C → demo data/scenarios verified, checklist complete (C5, C7)
Expected state → two consecutive clean runs on real hardware, within time cap

---

# 9. DEFINITION OF DONE FOR THE WHOLE TEAM

- [ ] Core execution: propose → intercept → policy → phone → approve/deny → verified execute/block works end to end
- [ ] Approval: biometric-signed, action-bound authorization issued and verified
- [ ] Denial: cryptographically real, command provably does not run
- [ ] Tamper rejection: swapped-command test blocked live
- [ ] Replay rejection: reused token blocked live (or clearly scripted if live version is unreliable)
- [ ] Expiry: unanswered action past TTL auto-resolves to blocked
- [ ] Fail-closed: relay-down and AI-down both confirmed to never auto-approve
- [ ] Phone experience: pending list, risk badge, approve/deny, history screen all working on the real iQOO phone
- [ ] AI fallback: static tier always works with zero network; Gemini falls back cleanly; local model integrated or consciously dropped
- [ ] Office Kit workflow: at least one real Red Light-window commit; demo opens with Office Kit mirroring
- [ ] Demo reliability: rehearsed twice on real hardware, under 5 minutes both times
- [ ] Repository: pushed before cutoff, fresh-clone test passed
- [ ] Documentation: setup/run instructions accurate and current
- [ ] Submission: demo assets attached per submission form, before hard cutoff

---

# 10. IF SOMEONE FINISHES EARLY

**A:**
1. Fix P0 security issues
2. Integration
3. Reliability
4. Performance
5. Stretch features (local model support, NPU exploration only if 4+ hours spare)

**B:**
1. Phone functionality
2. UX
3. AI explanation
4. Creative phone use (history, detail view)
5. Polish (voice read-out, visual polish)

**C:**
1. Test remaining failure scenarios
2. Regression testing after any change
3. Demo preparation
4. Documentation
5. Submission verification

**Rule:** do not start random features while P0 functionality is broken.

---

# 11. EMERGENCY FALLBACK PLAN

**IF WebAuthn fails**
→ switch `userVerification` to `"preferred"`, use genuine device user verification (biometric/PIN) through WebAuthn instead of biometric (real signing still happens).

**IF AI/local model fails**
→ use the static explanation tier; drop the "local model" claim from the pitch without faking it.

**IF MCP integration fails**
→ presenter manually triggers `propose_action` via a CLI wrapper calling the same interceptor code path; narrate "the agent would call this."

**IF relay fails**
→ same-network local relay hosted from the laptop, phone connects via LAN/hotspot IP.

**IF a stretch feature fails**
→ remove it; do not mention it in the pitch.

**IF the complete system becomes unstable**
→ revert to the last known-good commit and demo the smallest reliable subset: propose → approve → execute, plus one deny.

---

# 12. FINAL TEAM FLOW

```
SRI HARSHA
Security + Execution Gate + Integration
              ↓
        AgentGate Core
              ↑
SHAROOK ──────┤
Phone + AI    │
              │
TEJASWINI ────┘
Testing + Demo + Documentation
              ↓
       FINAL PHONE DEMO
```

End-to-end flow:

```
AI proposes
↓
Interceptor
↓
Policy
↓
Phone
↓
Human approval
↓
Action-bound authorization
↓
Execution Gate
↓
Independent verification
↓
Execute / Block
```


## WEBAUTHN SAFETY RULE

If WebAuthn has a device-specific issue, stop and ask an organiser/mentor before changing verification requirements. Any fallback must still preserve genuine WebAuthn user verification and must not weaken the security claim.
