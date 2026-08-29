/**
 * interceptor.test.ts — Unit tests for the AgentGate MCP Interceptor
 *
 * Tests cover:
 *   1. Valid actions are accepted and normalized correctly
 *   2. Semantic ActionPayload is cleanly separated from instance metadata
 *   3. Action type normalization enforces fail-closed on unknown categories
 *   4. Normalized action payloads have deterministic structure
 *   5. The interceptor DOES NOT execute the action
 *   6. pendingStore correctly tracks action lifecycle
 *   7. Production schemas (ProposeActionInputSchema & CheckStatusInputSchema)
 *      strictly validate inputs and reject malformed data
 *
 * Test framework: Vitest
 * Rule from tests/README.md: no test that always passes. Every test here
 * can fail if the implementation is wrong.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clearStore, getAction, addPending } from "../pendingStore.js";
import {
  buildProposedAction,
  normalizeActionType,
  ProposeActionInputSchema,
  CheckStatusInputSchema,
} from "../interceptor.js";
import type { ActionPayload, ProposedAction } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal valid raw input as an agent would supply it.
 */
function validRawInput(overrides: Partial<{
  type: string;
  command: string;
  target: string;
  params: Record<string, unknown>;
}> = {}): {
  type?: string;
  command: string;
  target: string;
  params?: Record<string, unknown>;
} {
  return {
    type: "shell",
    command: "ls -la",
    target: "/home/user/project",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearStore();
});

// ---------------------------------------------------------------------------
// 1. Valid actions are accepted and normalized
// ---------------------------------------------------------------------------

describe("buildProposedAction — valid input", () => {
  it("produces a ProposedAction with a UUID action_id", () => {
    const action = buildProposedAction(validRawInput());
    expect(action.action_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("preserves the command exactly in payload (trimmed)", () => {
    const action = buildProposedAction(validRawInput({ command: "  ls -la  " }));
    expect(action.payload.command).toBe("ls -la");
  });

  it("preserves the target exactly in payload (trimmed)", () => {
    const action = buildProposedAction(
      validRawInput({ target: "  /home/user/project  " })
    );
    expect(action.payload.target).toBe("/home/user/project");
  });

  it("sets a proposed_at ISO 8601 timestamp in metadata", () => {
    const before = new Date();
    const action = buildProposedAction(validRawInput());
    const after = new Date();
    const ts = new Date(action.proposed_at);
    expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(ts.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("defaults params in payload to empty object when not provided", () => {
    const input = validRawInput();
    const { params: _p, ...rest } = input as typeof input & { params?: unknown };
    void _p;
    const action = buildProposedAction(rest as Parameters<typeof buildProposedAction>[0]);
    expect(action.payload.params).toEqual({});
  });

  it("preserves params in payload when provided", () => {
    const action = buildProposedAction(
      validRawInput({ params: { force: true, branch: "main" } })
    );
    expect(action.payload.params).toEqual({ force: true, branch: "main" });
  });
});

// ---------------------------------------------------------------------------
// 2. Canonical Action Contract — Separation of Payload vs Metadata
// ---------------------------------------------------------------------------

describe("ActionPayload contract — semantic data vs ephemeral metadata", () => {
  it("isolates semantic fields in payload and excludes metadata", () => {
    const action = buildProposedAction(validRawInput());

    // Payload must contain ONLY the semantic fields that define the operation
    const payloadKeys = Object.keys(action.payload);
    expect(payloadKeys.sort()).toEqual(["command", "params", "target", "type"].sort());

    // Payload must NOT contain ephemeral metadata (action_id, timestamps, status)
    expect(action.payload).not.toHaveProperty("action_id");
    expect(action.payload).not.toHaveProperty("proposed_at");
    expect(action.payload).not.toHaveProperty("status");

    // Outer ProposedAction holds the metadata
    expect(action).toHaveProperty("action_id");
    expect(action).toHaveProperty("action_hash");
    expect(action).toHaveProperty("proposed_at");
    expect(action).toHaveProperty("payload");
  });
});

// ---------------------------------------------------------------------------
// 3. Action type normalization (fail-closed on unknown)
// ---------------------------------------------------------------------------

describe("normalizeActionType — fail-closed principle", () => {
  it("accepts 'shell' as-is", () => {
    expect(normalizeActionType("shell")).toBe("shell");
  });

  it("accepts 'sql' as-is", () => {
    expect(normalizeActionType("sql")).toBe("sql");
  });

  it("accepts 'file' as-is", () => {
    expect(normalizeActionType("file")).toBe("file");
  });

  it("accepts 'git' as-is", () => {
    expect(normalizeActionType("git")).toBe("git");
  });

  it("accepts 'network' as-is", () => {
    expect(normalizeActionType("network")).toBe("network");
  });

  it("accepts 'deploy' as-is", () => {
    expect(normalizeActionType("deploy")).toBe("deploy");
  });

  it("coerces an unrecognized string to 'unknown'", () => {
    expect(normalizeActionType("execute_now_please")).toBe("unknown");
  });

  it("coerces undefined to 'unknown'", () => {
    expect(normalizeActionType(undefined)).toBe("unknown");
  });

  it("coerces empty string to 'unknown'", () => {
    expect(normalizeActionType("")).toBe("unknown");
  });

  it("is case-sensitive — 'SHELL' coerces to 'unknown'", () => {
    expect(normalizeActionType("SHELL")).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// 4. Normalized action has deterministic payload structure
// ---------------------------------------------------------------------------

describe("buildProposedAction — deterministic structure", () => {
  it("two calls with the same input produce identical payloads (different action_ids)", () => {
    const input = validRawInput({
      type: "sql",
      command: "DROP TABLE sessions",
      target: "production-db",
    });
    const a1 = buildProposedAction(input);
    const a2 = buildProposedAction(input);

    // Ephemeral metadata differs
    expect(a1.action_id).not.toBe(a2.action_id);

    // Semantic payload is completely identical
    expect(a1.payload).toEqual(a2.payload);
    expect(a1.payload.type).toBe(a2.payload.type);
    expect(a1.payload.command).toBe(a2.payload.command);
    expect(a1.payload.target).toBe(a2.payload.target);
    expect(a1.payload.params).toEqual(a2.payload.params);
  });

  it("action structure contains all required fields", () => {
    const action = buildProposedAction(validRawInput());
    const requiredMetadata: (keyof ProposedAction)[] = [
      "action_id",
      "action_hash",
      "payload",
      "proposed_at",
    ];
    for (const field of requiredMetadata) {
      expect(action).toHaveProperty(field);
    }

    const requiredPayloadFields: (keyof ActionPayload)[] = [
      "type",
      "command",
      "target",
      "params",
    ];
    for (const field of requiredPayloadFields) {
      expect(action.payload).toHaveProperty(field);
    }
  });

  it("high-risk action is normalized without alteration of command or target", () => {
    const action = buildProposedAction({
      type: "sql",
      command: "DROP TABLE sessions",
      target: "production-db",
      params: { cascade: true },
    });
    expect(action.payload.type).toBe("sql");
    expect(action.payload.command).toBe("DROP TABLE sessions");
    expect(action.payload.target).toBe("production-db");
    expect(action.payload.params).toEqual({ cascade: true });
  });
});

// ---------------------------------------------------------------------------
// 5. The interceptor does NOT execute the action
// ---------------------------------------------------------------------------

describe("interceptor execution boundary", () => {
  it("buildProposedAction returns a ProposedAction — never an execution result", () => {
    const action = buildProposedAction(validRawInput({
      command: "rm -rf ./dist",
      target: "/home/user/project",
    }));

    // The returned object must be a proposal, not an execution result
    expect(action).toHaveProperty("action_id");
    expect(action).toHaveProperty("proposed_at");
    expect(action).toHaveProperty("payload");

    // It must NOT have an execution result field
    expect(action).not.toHaveProperty("stdout");
    expect(action).not.toHaveProperty("stderr");
    expect(action).not.toHaveProperty("exit_code");
    expect(action).not.toHaveProperty("output");
    expect(action).not.toHaveProperty("executed");
    expect(action.payload).not.toHaveProperty("executed");
  });

  it("storing an action in pendingStore gives it PENDING status — not EXECUTED", () => {
    const action = buildProposedAction(validRawInput({
      type: "shell",
      command: "git push --force",
      target: "origin/main",
    }));
    const entry = addPending(action);
    expect(entry.status).toBe("PENDING");
    expect(entry.status).not.toBe("EXECUTED");
    expect(entry.status).not.toBe("APPROVED");
  });
});

// ---------------------------------------------------------------------------
// 6. pendingStore — action lifecycle tracking
// ---------------------------------------------------------------------------

describe("pendingStore", () => {
  it("stores a new action as PENDING", () => {
    const action = buildProposedAction(validRawInput());
    addPending(action);
    const entry = getAction(action.action_id);
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("PENDING");
  });

  it("retrieves the correct action by action_id", () => {
    const action = buildProposedAction(validRawInput({
      command: "DROP TABLE sessions",
      target: "db",
    }));
    addPending(action);
    const retrieved = getAction(action.action_id);
    expect(retrieved!.action.payload.command).toBe("DROP TABLE sessions");
    expect(retrieved!.action.payload.target).toBe("db");
  });

  it("returns undefined for an unknown action_id", () => {
    const result = getAction("00000000-0000-4000-8000-000000000000");
    expect(result).toBeUndefined();
  });

  it("throws if the same action_id is added twice", () => {
    const action = buildProposedAction(validRawInput());
    addPending(action);
    expect(() => addPending(action)).toThrow(/collision/i);
  });

  it("clearStore removes all actions", () => {
    const a1 = buildProposedAction(validRawInput({ command: "ls", target: "/tmp" }));
    const a2 = buildProposedAction(validRawInput({ command: "pwd", target: "/home" }));
    addPending(a1);
    addPending(a2);
    clearStore();
    expect(getAction(a1.action_id)).toBeUndefined();
    expect(getAction(a2.action_id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Production Schemas Validation (ProposeActionInputSchema & CheckStatusInputSchema)
// ---------------------------------------------------------------------------

describe("Production ProposeActionInputSchema — input validation boundary", () => {
  it("accepts complete valid input", () => {
    const result = ProposeActionInputSchema.safeParse({
      type: "shell",
      command: "git status",
      target: "local-repo",
      params: { short: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty command string", () => {
    const result = ProposeActionInputSchema.safeParse({
      command: "",
      target: "/tmp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing command", () => {
    const result = ProposeActionInputSchema.safeParse({
      target: "/tmp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing target", () => {
    const result = ProposeActionInputSchema.safeParse({
      command: "ls",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty target string", () => {
    const result = ProposeActionInputSchema.safeParse({
      command: "ls",
      target: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string command (e.g. number)", () => {
    const result = ProposeActionInputSchema.safeParse({
      command: 42,
      target: "/tmp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null input", () => {
    const result = ProposeActionInputSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects undefined input", () => {
    const result = ProposeActionInputSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });
});

describe("Production CheckStatusInputSchema — status polling input boundary", () => {
  it("accepts a valid UUID action_id", () => {
    const result = CheckStatusInputSchema.safeParse({
      action_id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    const result = CheckStatusInputSchema.safeParse({
      action_id: "not-a-valid-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing action_id", () => {
    const result = CheckStatusInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-string action_id", () => {
    const result = CheckStatusInputSchema.safeParse({
      action_id: 12345,
    });
    expect(result.success).toBe(false);
  });
});
