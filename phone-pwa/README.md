# phone-pwa/ — Phone Approval Interface (Progressive Web App)

## Package overview

The phone app is the **human authorization surface** — the only place where
a human decision about an agent action can be made and signed.

It runs as a Progressive Web App (PWA) installed to the iQOO phone home
screen, launching full-screen with no browser chrome. The phone is physically
and logically separate from the laptop running the agent; the agent has no
access to the phone, its biometric sensors, or this app.

```
relay-server pushes: action:new  ←── Socket.IO / REST polling fallback
        ↓
Phone renders: action details, risk tier, risk score, reasons
        ↓
(Optional) AI-generated explanation (static template → Gemini → local model)
        ↓
Human taps Approve or Deny
        ↓
WebAuthn biometric prompt (device fingerprint / PIN)
        ↓
Signed decision { decision, action_id, action_hash, signature }
        ↓
POST /actions/:id/respond → relay-server → Execution Gate
```

## What the phone must display (planned)

- **Pending action list** — live feed, updated via Socket.IO
- **Action detail view:**
  - Exact action type and command
  - Target resource
  - Risk tier badge: `LOW` / `MEDIUM` / `HIGH`
  - Risk score (e.g. `87 / 100`)
  - Risk reason/facts from the policy engine
  - AI-generated explanation (labeled: `via: static / Gemini / local`)
  - Authorization state
- **Approve button** — triggers WebAuthn biometric prompt before signing
- **Deny button** — also cryptographically signed and action-bound
- **History / audit screen** — timeline of past actions with outcomes (P1)

## WebAuthn flow (planned)

1. **Registration (one-time):** phone registers a device-bound credential
   with relay-server (`/register-options` → biometric prompt →
   `/register-verify`)
2. **Signing (each decision):** phone requests an auth challenge from
   relay-server, presents it to the platform authenticator (biometric), and
   submits the signed result bound to `action_id` and `action_hash`

## AI explanation tiers (planned)

| Priority | Tier | Condition |
|---|---|---|
| P0 | Static deterministic template | Always available — zero network dependency |
| P1 | Gemini free-tier | Falls back to P0 on error / timeout |
| P2 (stretch) | Local Ollama / on-device model | Falls back to P1 → P0 |

**Critical rule:** AI explains. AI does **not** authorize. The explanation is
advisory context for the human. The human's biometric decision — not the
AI's suggestion — is the authorization.

## What will eventually be implemented here

- `src/App.tsx` — root component, routing
- `src/screens/PendingList.tsx` — live action feed
- `src/screens/ActionDetail.tsx` — detail view with approve/deny
- `src/screens/History.tsx` — audit/history screen (P1)
- `src/lib/webauthn.ts` — `@simplewebauthn/browser` registration + signing
- `src/lib/relay.ts` — Socket.IO client + REST polling fallback
- `src/lib/explanation.ts` — explanation tier: static → Gemini → local
- `manifest.json` + service worker — PWA installability
- `vite.config.ts` — Vite build configuration
- `package.json` — created when Task B1 begins

## What is NOT implemented yet

**Nothing is implemented.** This directory is a module boundary and planning
document only.

Do not create a placeholder phone UI that simulates approval without real
WebAuthn signing. The first real code here will be a blank installable PWA
that loads from the phone home screen (Task B1 in
`TEAM_EXECUTION_PLAN_FINAL.md`).

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 feature 3 (iQOO Phone Approval
  Console); P1 features 12, 13 (Audit/History, Local Gemma)
- `AgentGate_Judge_Submission.md` — Sections 5, 10, 13
- `TEAM_EXECUTION_PLAN_FINAL.md` — Tasks B1–B7
