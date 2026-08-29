# relay-server/ — Relay Server

## Package overview

The relay server is the **only communication channel** between the
laptop-side enforcement pipeline and the phone-side approval interface. It
bridges two physically separate trust boundaries.

```
mcp-interceptor (laptop)
        ↓
POST /actions          ← pending action submitted to relay
        ↓
Socket.IO push: action:new → phone-pwa (iQOO phone)
        ↓
Human approves or denies with biometric (WebAuthn)
        ↓
POST /actions/:id/respond  ← signed decision from phone
        ↓
Socket.IO push: action:resolved → mcp-interceptor (laptop)
        ↓
Execution Gate verifies and executes or blocks
```

## Socket.IO fallback

If the socket connection drops, both sides fall back to 2-second REST
polling (`GET /actions/:id`). No action is lost on a socket drop.

## Planned API surface

### HTTP (Express)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/actions` | Laptop submits a new pending action |
| `GET` | `/actions/:id` | Laptop / phone polls action state |
| `POST` | `/actions/:id/respond` | Phone submits a signed decision |
| `GET` | `/actions/history` | Audit log query (phone history screen — P1) |
| `POST` | `/register-options` | WebAuthn registration begin |
| `POST` | `/register-verify` | WebAuthn registration complete |
| `POST` | `/auth-options` | WebAuthn authentication begin |
| `POST` | `/auth-verify` | WebAuthn authentication complete |

### Socket.IO events

| Event | Direction | Payload |
|---|---|---|
| `action:new` | Relay → Phone | New pending action |
| `action:resolved` | Relay → Laptop | Decision received |

## What will eventually be implemented here

- `src/relay.ts` — Express + Socket.IO server entry point
- `src/actionStore.ts` — SQLite-backed pending-action and audit store
- `src/webauthn.ts` — `@simplewebauthn/server` registration + verification
- `src/schema.sql` — SQLite schema (actions, audit log, registered credentials)
- `.env.example` — environment variable reference (PORT, pairing secret, etc.)
- `package.json`, `tsconfig.json` — created when implementation begins

## What is NOT implemented yet

**Nothing is implemented.** This directory is a module boundary and planning
document only.

Do not add placeholder Express routes that return fake responses. The first
real code here will be a working relay with a live `/health` endpoint, per
Task A1 in `TEAM_EXECUTION_PLAN_FINAL.md`.

## Deployment note (planned)

Intended to run on a free-tier host (Render / Railway / Replit) so the phone
and laptop can communicate even when not on the same LAN. Availability of
any specific free-tier service is not guaranteed. A local network mode is a
noted fallback option.

## References

- `AGENTGATE_FEATURES_CURRENT_BUILD.md` — P0 feature 5 (Relay)
- `AgentGate_Judge_Submission.md` — Section 7 (AUTHSVC component)
- `TEAM_EXECUTION_PLAN_FINAL.md` — Tasks A1, A2, A6
