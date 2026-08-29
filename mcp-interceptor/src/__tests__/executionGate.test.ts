/**
 * executionGate.test.ts — Unit tests for the AgentGate Execution Gate (Task A3)
 *
 * Tests enforce:
 *   1. DEFAULT DENY: No token → BLOCK
 *   2. VALID AUTHORIZATION: Valid token with matching signature → ALLOW / EXECUTED
 *   3. TAMPERED SIGNATURE: Altered signature or statement → BLOCK
 *   4. INDEPENDENT VERIFICATION: Transport flags (e.g. verified: true) without signature → BLOCK
 *   5. HUMAN DENIAL: Decision "denied" → BLOCK / DENIED
 *   6. UNKNOWN CREDENTIAL: Token signed with unregistered key → BLOCK
 *   7. MALFORMED TOKEN: Missing required fields → BLOCK
 *   8. ACTION ID MISMATCH: Token for action A presented for action B → BLOCK
 *   9. AUDIT LOGGING: Every attempt produces a detailed SQLite record (no secrets stored)
 *  10. EXECUTION BOUNDARY: Executor function is called ONLY on successful authorization
 *  11. A4 ACTION BINDING: a signed action hash blocks payload tampering
 *
 * Test framework: Vitest
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  evaluateAuthorization,
  verifyAndExecute,
  signAuthorizationToken,
  verifyTokenSignature,
  createAuthorizationStatement,
} from "../gate/executionGate.js";
import {
  registerCredential,
  clearCredentials,
  getPublicKey,
} from "../gate/credentialRegistry.js";
import {
  getAuditLogs,
  getAuditLogsByActionId,
  clearAuditLog,
  closeAuditDb,
} from "../gate/auditLog.js";
import { clearStore, addPending, getAction } from "../pendingStore.js";
import { buildProposedAction } from "../interceptor.js";
import type { AuthorizationToken, ProposedAction } from "../types.js";

// ---------------------------------------------------------------------------
// Test Keypair Helpers
// ---------------------------------------------------------------------------

interface TestKeypair {
  credential_id: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

function generateEd25519Keypair(credential_id: string): TestKeypair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  return {
    credential_id,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

function createSampleAction(command: string = "DROP TABLE sessions"): ProposedAction {
  return buildProposedAction({
    type: "sql",
    command,
    target: "production-db",
    params: { env: "prod" },
  });
}

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

let primaryDevice: TestKeypair;
let secondaryDevice: TestKeypair;

beforeEach(() => {
  clearStore();
  clearCredentials();
  clearAuditLog();

  primaryDevice = generateEd25519Keypair("cred-iqoo-phone-001");
  secondaryDevice = generateEd25519Keypair("cred-unregistered-device-999");

  // Register only the primary device
  registerCredential(
    primaryDevice.credential_id,
    primaryDevice.publicKeyPem,
    "iQOO 12 (Authorized Phone)"
  );
});

afterEach(() => {
  clearStore();
  clearCredentials();
  clearAuditLog();
});

// ---------------------------------------------------------------------------
// 1. DEFAULT DENY
// ---------------------------------------------------------------------------

describe("Execution Gate — Default Deny", () => {
  it("refuses execution when no authorization token is provided", async () => {
    const action = createSampleAction();
    let executed = false;

    const result = await verifyAndExecute(action, undefined, () => {
      executed = true;
      return "executed";
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.executed).toBe(false);
    expect(executed).toBe(false);
    expect(result.reason).toMatch(/missing authorization token/i);
  });
});

// ---------------------------------------------------------------------------
// 2. VALID AUTHORIZATION
// ---------------------------------------------------------------------------

describe("Execution Gate — Valid Authorization", () => {
  it("allows execution when a valid signature from a registered credential is provided", async () => {
    const action = createSampleAction();
    addPending(action);

    const token = signAuthorizationToken(
      action,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    let executed = false;
    const result = await verifyAndExecute(action, token, () => {
      executed = true;
      return "DROP TABLE success";
    });

    expect(result.allowed).toBe(true);
    expect(result.status).toBe("EXECUTED");
    expect(result.executed).toBe(true);
    expect(result.execution_output).toBe("DROP TABLE success");
    expect(executed).toBe(true);

    // Verify pendingStore updated
    const entry = getAction(action.action_id);
    expect(entry?.status).toBe("EXECUTED");
  });

  it("produces APPROVED status when authorization is valid without an executor callback", async () => {
    const action = createSampleAction();
    const token = signAuthorizationToken(
      action,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    const result = await verifyAndExecute(action, token);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("APPROVED");
    expect(result.executed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. TAMPERED & INVALID SIGNATURES
// ---------------------------------------------------------------------------

describe("Execution Gate — Tamper & Invalid Signature Rejection", () => {
  it("blocks execution when the signature is corrupted/tampered", async () => {
    const action = createSampleAction();
    const validToken = signAuthorizationToken(
      action,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    // Tamper with signature bytes
    const tamperedToken: AuthorizationToken = {
      ...validToken,
      signature: Buffer.from("corrupted-tampered-signature").toString("base64"),
    };

    let executed = false;
    const result = await verifyAndExecute(action, tamperedToken, () => {
      executed = true;
      return "should not run";
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.executed).toBe(false);
    expect(executed).toBe(false);
    expect(result.reason).toMatch(/signature verification failed/i);
  });

  it("blocks execution when the signed timestamp is modified after signing", async () => {
    const action = createSampleAction();
    const token = signAuthorizationToken(
      action,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem,
      "2026-08-29T10:00:00.000Z"
    );

    // Modify timestamp in token without updating signature
    const tamperedToken: AuthorizationToken = {
      ...token,
      signed_at: "2026-08-29T11:00:00.000Z",
    };

    const result = await verifyAndExecute(action, tamperedToken);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toMatch(/signature verification failed/i);
  });
});

// ---------------------------------------------------------------------------
// 4. INDEPENDENT VERIFICATION (NO TRUST IN TRANSPORT FLAGS)
// ---------------------------------------------------------------------------

describe("Execution Gate — Independent Verification Requirement", () => {
  it("refuses execution even if a fake relay object with verified: true is passed", async () => {
    const action = createSampleAction();

    // Attacker passes an object claiming verified: true but without cryptographic signature
    const fakeToken = {
      action_id: action.action_id,
      decision: "approved" as const,
      credential_id: primaryDevice.credential_id,
      signature: "", // missing signature
      action_hash: action.action_hash,
      signed_at: new Date().toISOString(),
      verified: true, // transport flag attempt
      approved: true, // transport flag attempt
    };

    let executed = false;
    const result = await verifyAndExecute(action, fakeToken, () => {
      executed = true;
      return "attacker ran";
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(executed).toBe(false);
    expect(result.reason).toMatch(/malformed authorization token/i);
  });
});

// ---------------------------------------------------------------------------
// 5. HUMAN DENIAL PATH
// ---------------------------------------------------------------------------

describe("Execution Gate — Human Denial", () => {
  it("blocks execution when the signed decision is 'denied'", async () => {
    const action = createSampleAction();
    addPending(action);

    const token = signAuthorizationToken(
      action,
      "denied",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    let executed = false;
    const result = await verifyAndExecute(action, token, () => {
      executed = true;
      return "should not run";
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("DENIED");
    expect(result.executed).toBe(false);
    expect(executed).toBe(false);
    expect(result.reason).toMatch(/denied by human authorizer/i);

    // Check pending store updated to DENIED
    const entry = getAction(action.action_id);
    expect(entry?.status).toBe("DENIED");
  });
});

// ---------------------------------------------------------------------------
// 6. UNKNOWN CREDENTIAL / UNREGISTERED PUBLIC KEY
// ---------------------------------------------------------------------------

describe("Execution Gate — Unregistered Credential Rejection", () => {
  it("blocks execution when token is signed with a valid keypair that is NOT registered on the laptop", async () => {
    const action = createSampleAction();

    // Signed with secondaryDevice (not in credentialRegistry)
    const token = signAuthorizationToken(
      action,
      "approved",
      secondaryDevice.credential_id,
      secondaryDevice.privateKeyPem
    );

    const result = await verifyAndExecute(action, token);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toMatch(/unknown or unauthenticated credential_id/i);
  });
});

// ---------------------------------------------------------------------------
// 7. ACTION ID MISMATCH (CROSS-ACTION REPLAY)
// ---------------------------------------------------------------------------

describe("Execution Gate — Action ID Binding", () => {
  it("blocks execution when token for Action A is presented for Action B", async () => {
    const actionA = createSampleAction("rm -rf /safe/dir");
    const actionB = createSampleAction("rm -rf /critical/production/data");

    // Authorize Action A
    const tokenForA = signAuthorizationToken(
      actionA,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    // Present tokenForA to execute Action B
    let executedB = false;
    const result = await verifyAndExecute(actionB, tokenForA, () => {
      executedB = true;
      return "action B executed";
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(executedB).toBe(false);
    expect(result.reason).toMatch(/action id mismatch/i);
  });
});

// ---------------------------------------------------------------------------
// 8. SQLITE AUDIT LOGGING
// ---------------------------------------------------------------------------

describe("Execution Gate — SQLite Audit Trail", () => {
  it("records an audit entry for every gate attempt (both ALLOW and BLOCK)", async () => {
    const action1 = createSampleAction("git push origin main");
    const action2 = createSampleAction("DROP DATABASE prod");

    // Attempt 1: Blocked (no token)
    await verifyAndExecute(action1);

    // Attempt 2: Allowed
    const token = signAuthorizationToken(
      action2,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );
    await verifyAndExecute(action2, token, () => "db dropped");

    const logs = getAuditLogs();
    expect(logs.length).toBe(2);

    // Most recent log first (DESC order)
    const allowedLog = logs[0]!;
    expect(allowedLog.action_id).toBe(action2.action_id);
    expect(allowedLog.decision).toBe("ALLOW");
    expect(allowedLog.status).toBe("EXECUTED");
    expect(allowedLog.credential_id).toBe(primaryDevice.credential_id);
    expect(allowedLog.command).toBe("DROP DATABASE prod");

    const blockedLog = logs[1]!;
    expect(blockedLog.action_id).toBe(action1.action_id);
    expect(blockedLog.decision).toBe("BLOCK");
    expect(blockedLog.status).toBe("BLOCKED");
    expect(blockedLog.reason).toMatch(/missing authorization token/i);

    // Ensure no private keys leaked in reason
    expect(allowedLog.reason).not.toMatch(/PRIVATE KEY/);
    expect(blockedLog.reason).not.toMatch(/PRIVATE KEY/);
  });

  it("can query audit logs by action_id", async () => {
    const action = createSampleAction("npm publish");

    // 1st attempt: blocked (tampered)
    const invalidToken: AuthorizationToken = {
      action_id: action.action_id,
      decision: "approved",
      credential_id: primaryDevice.credential_id,
      signature: "invalid",
      action_hash: action.action_hash,
      signed_at: new Date().toISOString(),
    };
    await verifyAndExecute(action, invalidToken);

    // 2nd attempt: allowed
    const validToken = signAuthorizationToken(
      action,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );
    await verifyAndExecute(action, validToken, () => "published");

    const actionLogs = getAuditLogsByActionId(action.action_id);
    expect(actionLogs.length).toBe(2);
    expect(actionLogs[0]!.decision).toBe("BLOCK");
    expect(actionLogs[1]!.decision).toBe("ALLOW");
  });
});

// ---------------------------------------------------------------------------
// 9. A4 ACTION HASH BINDING
// ---------------------------------------------------------------------------

describe("Execution Gate — Action Hash Binding", () => {
  it("blocks execution when an approved action is modified after signing", async () => {
    const approvedAction = createSampleAction("rm -rf /safe/dir");
    const token = signAuthorizationToken(
      approvedAction,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    // Simulate a bait-and-switch that retains the instance ID but changes
    // the semantic command after the user approved it.
    const tamperedAction: ProposedAction = {
      ...approvedAction,
      payload: {
        ...approvedAction.payload,
        command: "rm -rf /critical/production/data",
      },
    };

    let executed = false;
    const result = await verifyAndExecute(
      tamperedAction,
      token,
      () => {
        executed = true;
        return "ran";
      }
    );

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(executed).toBe(false);
    expect(result.reason).toMatch(/action hash verification failed/i);
  });

  it("allows execution when the signed hash matches the exact action", async () => {
    const action = createSampleAction();
    const token = signAuthorizationToken(
      action,
      "approved",
      primaryDevice.credential_id,
      primaryDevice.privateKeyPem
    );

    let executed = false;
    const result = await verifyAndExecute(
      action,
      token,
      () => {
        executed = true;
        return "ran";
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.status).toBe("EXECUTED");
    expect(executed).toBe(true);
  });
});
