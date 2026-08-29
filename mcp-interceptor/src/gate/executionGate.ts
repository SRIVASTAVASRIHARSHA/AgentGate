/**
 * executionGate.ts — Execution Gate (Final Enforcement Point)
 *
 * The Execution Gate is the sole laptop-side component with authority to permit
 * action execution. It executes on the laptop and enforces the absolute rule:
 *
 *   "Never execute unless independently verified. Fail closed."
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. DEFAULT DENY: Without valid authorization, execution is unconditionally blocked.
 * 2. INDEPENDENT VERIFICATION: The gate re-verifies cryptographic signatures against
 *    cached public keys. It NEVER trusts transport flags ("verified: true", "approved: true").
 * 3. NO EXECUTION ON TAMPER/DENIAL: If signature check fails, action ID mismatches, or
 *    decision is "denied", execution is prevented.
 * 4. AUDIT TRAIL: Every attempt (both allowed and blocked) is written to SQLite.
 *
 * References:
 *   - TEAM_EXECUTION_PLAN_FINAL.md (Task A3)
 *   - AGENTGATE_FEATURES_CURRENT_BUILD.md (P0 feature 2 & 7)
 *   - AgentGate_Judge_Submission.md (Section 7 — GATE component, Section 10)
 */

import crypto from "node:crypto";
import { hashAction } from "../hashing/hash.js";
import { getPublicKey } from "./credentialRegistry.js";
import { recordGateAttempt } from "./auditLog.js";
import { updateStatus, getAction } from "../pendingStore.js";
import type {
  ActionStatus,
  AuthorizationToken,
  GateDecisionResult,
  ProposedAction,
} from "../types.js";

/**
 * Options for configuring gate verification and downstream extension hooks (e.g. Task A4).
 */
export interface GateOptions {
  /**
   * Optional custom timestamp for deterministic testing.
   */
  now?: () => string;
}

/**
 * Construct the canonical authorization statement that was signed by the phone.
 *
 * Formatted as a deterministic JSON string with sorted keys.
 */
export function createAuthorizationStatement(
  action_id: string,
  decision: string,
  action_hash: string,
  signed_at: string
): string {
  return JSON.stringify({
    action_id,
    action_hash,
    decision,
    signed_at,
  });
}

/**
 * Helper to generate a signed authorization token for a given action and keypair.
 *
 * Used by test suites and future phone-side / client-side mock tools.
 */
export function signAuthorizationToken(
  action: ProposedAction,
  decision: "approved" | "denied",
  credential_id: string,
  privateKeyPem: string,
  signed_at: string = new Date().toISOString()
): AuthorizationToken {
  const statement = createAuthorizationStatement(
    action.action_id,
    decision,
    action.action_hash,
    signed_at
  );
  const data = Buffer.from(statement, "utf8");

  let signature: string;
  try {
    // Try Ed25519 signing (null algorithm)
    signature = crypto.sign(null, data, privateKeyPem).toString("base64");
  } catch {
    // Fall back to SHA-256 (RSA / ECDSA)
    signature = crypto.sign("sha256", data, privateKeyPem).toString("base64");
  }

  return {
    action_id: action.action_id,
    decision,
    action_hash: action.action_hash,
    credential_id,
    signature,
    signed_at,
  };
}

/**
 * Independently verify the cryptographic signature of an AuthorizationToken.
 *
 * @param token The authorization token presented to the gate
 * @param publicKeyPem The registered public key for this credential
 */
export function verifyTokenSignature(
  token: AuthorizationToken,
  publicKeyPem: string
): boolean {
  try {
    const statement = createAuthorizationStatement(
      token.action_id,
      token.decision,
      token.action_hash,
      token.signed_at
    );
    const data = Buffer.from(statement, "utf8");
    const sigBuffer = Buffer.from(token.signature, "base64");

    // Try Ed25519 (null algorithm)
    try {
      if (crypto.verify(null, data, publicKeyPem, sigBuffer)) {
        return true;
      }
    } catch {
      // Fallback for RSA / ECDSA
    }

    // Try standard SHA-256 verification
    return crypto.verify("sha256", data, publicKeyPem, sigBuffer);
  } catch {
    return false;
  }
}

/**
 * Pure evaluation function for the Execution Gate.
 *
 * Evaluates all authorization checks and returns the validation outcome
 * without executing the command or modifying storage.
 */
export function evaluateAuthorization(
  action: ProposedAction,
  token?: AuthorizationToken,
  options?: GateOptions
): { valid: boolean; status: ActionStatus; reason: string } {
  // 1. DEFAULT DENY: Missing authorization token
  if (!token) {
    return {
      valid: false,
      status: "BLOCKED",
      reason: "Missing authorization token: execution refused by default",
    };
  }

  // 2. Structural validation of authorization token
  if (
    !token.action_id ||
    !token.decision ||
    !token.credential_id ||
    !token.signature ||
    !token.action_hash ||
    !token.signed_at
  ) {
    return {
      valid: false,
      status: "BLOCKED",
      reason: "Malformed authorization token: missing required fields",
    };
  }

  // 3. Action ID matching check
  if (token.action_id !== action.action_id) {
    return {
      valid: false,
      status: "BLOCKED",
      reason: `Action ID mismatch: token was issued for ${token.action_id} but presented for ${action.action_id}`,
    };
  }

  // 4. Human decision check (denials must be enforced as BLOCKED/DENIED)
  if (token.decision !== "approved") {
    return {
      valid: false,
      status: "DENIED",
      reason: `Action was denied by human authorizer (decision: ${token.decision})`,
    };
  }

  // 5. Credential public key lookup (fail-closed if unknown)
  const publicKeyPem = getPublicKey(token.credential_id);
  if (!publicKeyPem) {
    return {
      valid: false,
      status: "BLOCKED",
      reason: `Unknown or unauthenticated credential_id: ${token.credential_id}`,
    };
  }

  // 6. Independent cryptographic signature verification
  const isSignatureValid = verifyTokenSignature(token, publicKeyPem);
  if (!isSignatureValid) {
    return {
      valid: false,
      status: "BLOCKED",
      reason: "Cryptographic signature verification failed: invalid or tampered authorization",
    };
  }

  // 7. Recompute the exact semantic action hash at the final enforcement point.
  // This must be mandatory: a token for action A cannot authorize altered action B.
  let recomputedHash: string;
  try {
    recomputedHash = hashAction(action.payload);
  } catch {
    return {
      valid: false,
      status: "BLOCKED",
      reason: "Action hash verification failed: action payload cannot be canonicalized",
    };
  }

  if (action.action_hash !== recomputedHash || token.action_hash !== recomputedHash) {
    return {
      valid: false,
      status: "BLOCKED",
      reason: "Action hash verification failed: action modified after authorization",
    };
  }

  // All checks passed
  return {
    valid: true,
    status: "APPROVED",
    reason: "Authorization independently verified against registered credential",
  };
}

/**
 * The main Execution Gate entry point.
 *
 * Verifies authorization independently, updates pending action state,
 * writes to the SQLite audit log, and conditionally executes the action
 * via the provided executor.
 *
 * @param action The ProposedAction to be authorized
 * @param token The AuthorizationToken presented for execution
 * @param executor Optional execution callback that runs ONLY if verified
 * @param options Configuration options / hooks
 */
export async function verifyAndExecute(
  action: ProposedAction,
  token?: AuthorizationToken,
  executor?: () => Promise<string> | string,
  options?: GateOptions
): Promise<GateDecisionResult> {
  const timestamp = options?.now ? options.now() : new Date().toISOString();

  // Evaluate authorization rules independently
  const evaluation = evaluateAuthorization(action, token, options);

  if (!evaluation.valid) {
    // Record BLOCKED attempt in audit log
    recordGateAttempt({
      action_id: action.action_id,
      command: action.payload.command,
      target: action.payload.target,
      decision: "BLOCK",
      status: evaluation.status,
      reason: evaluation.reason,
      credential_id: token?.credential_id ?? null,
      timestamp,
    });

    // Update pendingStore status if action is tracked
    if (getAction(action.action_id)) {
      try {
        updateStatus(action.action_id, evaluation.status);
      } catch {
        // Ignore store update errors if untracked
      }
    }

    return {
      allowed: false,
      status: evaluation.status,
      reason: evaluation.reason,
      action_id: action.action_id,
      executed: false,
    };
  }

  // Verification succeeded — execute action if executor is supplied
  let executionOutput: string | undefined;
  if (executor) {
    try {
      executionOutput = await executor();
    } catch (execErr) {
      const errorMsg = execErr instanceof Error ? execErr.message : String(execErr);

      // Record execution failure in audit log
      recordGateAttempt({
        action_id: action.action_id,
        command: action.payload.command,
        target: action.payload.target,
        decision: "ALLOW",
        status: "BLOCKED",
        reason: `Execution failed: ${errorMsg}`,
        credential_id: token?.credential_id ?? null,
        timestamp,
      });

      return {
        allowed: true,
        status: "BLOCKED",
        reason: `Authorization succeeded, but execution failed: ${errorMsg}`,
        action_id: action.action_id,
        executed: false,
      };
    }
  }

  // Record successful ALLOW in audit log
  recordGateAttempt({
    action_id: action.action_id,
    command: action.payload.command,
    target: action.payload.target,
    decision: "ALLOW",
    status: executor ? "EXECUTED" : "APPROVED",
    reason: evaluation.reason,
    credential_id: token?.credential_id ?? null,
    timestamp,
  });

  // Update pendingStore status
  if (getAction(action.action_id)) {
    try {
      updateStatus(action.action_id, executor ? "EXECUTED" : "APPROVED");
    } catch {
      // Ignore
    }
  }

  return {
    allowed: true,
    status: executor ? "EXECUTED" : "APPROVED",
    reason: evaluation.reason,
    action_id: action.action_id,
    executed: Boolean(executor),
    execution_output: executionOutput,
  };
}
