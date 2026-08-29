/**
 * types.ts — Shared AgentGate action and pipeline types
 *
 * These types are the contract between the MCP Interceptor and all downstream
 * AgentGate components (policy engine, hashing, relay, execution gate).
 *
 * Field names and semantics are derived directly from the project documentation:
 *   - AGENTGATE_FEATURES_CURRENT_BUILD.md (P0 features 1–7)
 *   - AgentGate_Judge_Submission.md (Sections 7, 9, 10)
 *   - TEAM_EXECUTION_PLAN_FINAL.md (Tasks A3–A5)
 */

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

/**
 * The set of known action categories the interceptor can receive.
 *
 * "unknown" is intentionally included so the policy engine can assign
 * HIGH / REQUIRE_APPROVAL to anything that doesn't match a known category
 * (fail-closed principle).
 */
export type ActionType =
  | "shell"
  | "sql"
  | "file"
  | "git"
  | "network"
  | "deploy"
  | "unknown";

/**
 * ActionPayload is the semantic action specification requested by the agent.
 *
 * It contains exclusively the operational data describing what the agent wants to do:
 * - type: action category
 * - command: exact command/query
 * - target: resource targeted
 * - params: operational parameters
 *
 * CRITICAL SECURITY INVARIANT:
 * Ephemeral metadata (action_id, timestamps, lifecycle states) MUST NOT be placed
 * in this structure. This ensures the future hashing/canonicalization module (Task A4)
 * computes SHA-256 hashes strictly over semantic payload data.
 */
export interface ActionPayload {
  /**
   * Category of the action.
   * Determines which policy rules apply.
   * Defaults to "unknown" if the agent does not supply a recognized type.
   */
  readonly type: ActionType;

  /**
   * The exact command, query, or operation being proposed.
   * e.g. "DROP TABLE sessions", "git push --force", "rm -rf ./dist"
   *
   * Required. The interceptor rejects proposals without a command.
   */
  readonly command: string;

  /**
   * The resource, path, database, or service the command targets.
   * e.g. "production-db", "/home/user/.env", "origin/main"
   *
   * Required. The interceptor rejects proposals without a target.
   */
  readonly target: string;

  /**
   * Additional structured parameters beyond command and target.
   * e.g. { force: true, branch: "main" } for a git push
   *
   * Optional. Defaults to empty object if not provided.
   */
  readonly params: Record<string, unknown>;
}

/**
 * A ProposedAction wraps the semantic ActionPayload with instance metadata
 * (action_id, proposed_at) when entering the AgentGate pipeline.
 *
 * The interceptor produces this from raw MCP tool input.
 * All downstream components consume this shape — never the raw MCP input.
 *
 * Security note: this type does NOT include an execution result. The
 * interceptor produces proposals; the Execution Gate handles execution.
 */
export interface ProposedAction {
  /** Unique identifier for this action instance (UUID v4) */
  readonly action_id: string;

  /** The semantic action payload to be evaluated and authorized */
  readonly payload: ActionPayload;

  /** ISO 8601 timestamp when the action entered the interceptor */
  readonly proposed_at: string;
}

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

/**
 * The lifecycle states of a proposed action.
 *
 * Documented in AGENTGATE_FEATURES_CURRENT_BUILD.md (P0 feature 6)
 * and mcp-interceptor/README.md.
 *
 * State machine (happy path):
 *   PENDING → APPROVED → EXECUTED
 *
 * Termination states:
 *   PENDING → DENIED   (human denied on phone)
 *   PENDING → BLOCKED  (gate blocked: tamper / replay / expiry / fail-closed)
 *   APPROVED → BLOCKED (gate blocked after approval: tamper detected)
 */
export type ActionStatus =
  | "PENDING"   // waiting for policy evaluation or human decision
  | "APPROVED"  // phone authorized; Execution Gate may proceed
  | "DENIED"    // phone denied; Execution Gate will block
  | "BLOCKED"   // gate blocked: tamper / replay / expiry / fail-closed
  | "EXECUTED"; // action has completed execution

// ---------------------------------------------------------------------------
// Pending action store entry
// ---------------------------------------------------------------------------

/**
 * A PendingAction is a store entry that wraps a ProposedAction with its
 * current lifecycle status.
 *
 * The pendingStore holds these entries. The relay-server will eventually
 * read from this store when forwarding actions to the phone.
 */
export interface PendingAction {
  readonly action: ProposedAction;
  status: ActionStatus;
  /** ISO 8601 timestamp of the most recent status change */
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Interceptor result
// ---------------------------------------------------------------------------

/**
 * The result the interceptor returns to the MCP tool caller (the AI agent)
 * after receiving a propose_action call.
 *
 * On success: action_id is set and status is "PENDING".
 * On validation failure: error is set, action_id is null, status is "BLOCKED".
 */
export type InterceptorResult =
  | {
      readonly success: true;
      readonly action_id: string;
      readonly status: "PENDING";
    }
  | {
      readonly success: false;
      readonly action_id: null;
      readonly status: "BLOCKED";
      readonly error: string;
    };

// ---------------------------------------------------------------------------
// check_action_status result
// ---------------------------------------------------------------------------

/**
 * The result returned by the check_action_status MCP tool.
 * The agent polls this until status is no longer PENDING.
 */
export interface ActionStatusResult {
  readonly action_id: string;
  readonly status: ActionStatus;
  /** Set when status is EXECUTED — what the action produced */
  readonly result?: string;
  /** Set when status is BLOCKED or DENIED — reason for the block */
  readonly reason?: string;
}

// ---------------------------------------------------------------------------
// Authorization token types (Task A3 / A4)
// ---------------------------------------------------------------------------

/**
 * Human authorization decision.
 */
export type HumanDecision = "approved" | "denied";

/**
 * AuthorizationToken represents the signed decision from the authorized device (phone).
 *
 * CRITICAL SECURITY PROPERTY:
 * The Execution Gate on the laptop independently re-verifies this token against
 * the cached public key for `credential_id`. It does not rely on a transport flag.
 */
export interface AuthorizationToken {
  /** The action_id this authorization claims to bind to */
  readonly action_id: string;

  /** The human decision: "approved" | "denied" */
  readonly decision: HumanDecision;

  /** Identifier of the credential / device key that signed this token */
  readonly credential_id: string;

  /** Cryptographic signature over the authorization statement (base64) */
  readonly signature: string;

  /** ISO 8601 timestamp when the authorization was signed */
  readonly signed_at: string;

  /**
   * Action hash for future Task A4 cryptographic binding.
   * Defined here as an optional field to establish a clean A3/A4 boundary.
   */
  readonly action_hash?: string;
}

// ---------------------------------------------------------------------------
// Execution Gate decision & audit types
// ---------------------------------------------------------------------------

/**
 * The outcome produced by the Execution Gate when evaluating an action execution request.
 */
export interface GateDecisionResult {
  /** True ONLY if independent cryptographic verification succeeded and decision was approved */
  readonly allowed: boolean;

  /** Resulting lifecycle status */
  readonly status: ActionStatus;

  /** Explicit reason for the decision */
  readonly reason: string;

  /** The action_id evaluated */
  readonly action_id: string;

  /** Whether the protected action was executed by the gate */
  readonly executed: boolean;

  /** Output or return value if execution occurred */
  readonly execution_output?: string;
}

/**
 * Record written to the SQLite audit log on every execution gate attempt.
 *
 * SECURITY: Must not store private keys, secrets, or credential material.
 */
export interface AuditLogRecord {
  readonly id?: number;
  readonly action_id: string;
  readonly command: string;
  readonly target: string;
  readonly decision: "ALLOW" | "BLOCK";
  readonly status: ActionStatus;
  readonly reason: string;
  readonly credential_id: string | null;
  readonly timestamp: string;
}
