/**
 * interceptor.ts — AgentGate MCP Interceptor
 *
 * This is the enforcement entry point between an AI agent and the AgentGate
 * security pipeline. It is implemented as a Model Context Protocol (MCP)
 * server using a stdio transport so any MCP-capable agent (e.g. Claude Code)
 * can connect without additional network configuration.
 *
 * Exposes two MCP tools:
 *
 *   propose_action        — receives an agent's requested action, validates
 *                           and normalizes it, stores it as PENDING, and
 *                           notifies the relay for forwarding to the phone.
 *
 *   check_action_status   — lets the agent poll for the current status of
 *                           a previously proposed action.
 *
 * Security principle enforced here:
 *   The interceptor DOES NOT EXECUTE the requested action.
 *   RECEIVE → VALIDATE → NORMALIZE → STORE → FORWARD is the only path.
 *   Execution belongs to the Execution Gate (mcp-interceptor/gate/).
 *
 * References:
 *   - AGENTGATE_FEATURES_CURRENT_BUILD.md — P0 feature 4 (MCP Interceptor)
 *   - AgentGate_Judge_Submission.md — Section 7 (INT component)
 *   - TEAM_EXECUTION_PLAN_FINAL.md — Task A5
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { pathToFileURL } from "node:url";
import { hashAction } from "./hashing/hash.js";
import { addPending, getAction } from "./pendingStore.js";
import { notifyRelay } from "./relayClient.js";
import type {
  ActionStatusResult,
  ActionType,
  InterceptorResult,
  ProposedAction,
} from "./types.js";

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

/**
 * The set of valid action types the interceptor accepts.
 * Anything outside this list is coerced to "unknown" so the policy engine
 * can apply its fail-closed rule (unknown → HIGH / REQUIRE_APPROVAL).
 */
const VALID_ACTION_TYPES: readonly ActionType[] = [
  "shell",
  "sql",
  "file",
  "git",
  "network",
  "deploy",
  "unknown",
] as const;

/**
 * Schema for the propose_action MCP tool input.
 *
 * Fields match the ProposedAction interface defined in types.ts and the
 * action representation documented in mcp-interceptor/README.md:
 *   { type, command, target, params }
 */
export const ProposeActionInputSchema = z.object({
  type: z
    .string()
    .optional()
    .describe(
      "Action category: shell | sql | file | git | network | deploy | unknown"
    ),
  command: z
    .string()
    .min(1, "command must be a non-empty string")
    .describe("The exact command, query, or operation being proposed"),
  target: z
    .string()
    .min(1, "target must be a non-empty string")
    .describe(
      "The resource, path, database, or service the command targets"
    ),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Additional structured parameters (optional)"),
}).strict();

/**
 * Schema for the check_action_status MCP tool input.
 */
export const CheckStatusInputSchema = z.object({
  action_id: z
    .string()
    .uuid("action_id must be a valid UUID")
    .describe("The action_id returned by a previous propose_action call"),
}).strict();

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize the raw action type string to a known ActionType.
 *
 * If the caller supplies a recognized type, it is used as-is.
 * Anything else — including an absent type — becomes "unknown", which
 * causes the policy engine to apply its fail-closed rule.
 *
 * This is intentional: the interceptor must never silently promote an
 * unrecognized action to a known low-risk category.
 */
export function normalizeActionType(raw: string | undefined): ActionType {
  if (raw && (VALID_ACTION_TYPES as readonly string[]).includes(raw)) {
    return raw as ActionType;
  }
  return "unknown";
}

/**
 * Build a normalized ProposedAction from validated MCP tool input.
 *
 * The resulting object is the single source of truth for this action
 * throughout the AgentGate pipeline. Downstream components (policy engine,
 * hashing module, execution gate) consume this shape — never the raw input.
 *
 * Ephemeral metadata (action_id, proposed_at) is kept distinct from the
 * semantic ActionPayload (payload) so cryptographic binding and policy
 * rules operate purely on semantic actions.
 */
export function buildProposedAction(
  input: z.infer<typeof ProposeActionInputSchema>
): ProposedAction {
  const payload = {
    type: normalizeActionType(input.type),
    command: input.command.trim(),
    target: input.target.trim(),
    params: input.params ?? {},
  };

  return {
    action_id: randomUUID(),
    payload,
    action_hash: hashAction(payload),
    proposed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// MCP server setup
// ---------------------------------------------------------------------------

/** Register AgentGate's proposal-only tools on a new MCP server instance. */
function registerTools(server: McpServer): void {

// ---------------------------------------------------------------------------
// Tool: propose_action
// ---------------------------------------------------------------------------

/**
 * propose_action — The primary interception entry point.
 *
 * Receives an agent's requested action, validates its structure, normalizes
 * it into a ProposedAction, stores it as PENDING, and notifies the relay
 * server so the action can be forwarded to the phone for human approval.
 *
 * The agent receives an action_id it can use to poll check_action_status.
 *
 * SECURITY: This tool does NOT execute the action. It cannot execute the
 * action. Execution only happens via the Execution Gate after a valid,
 * action-bound authorization is received from the phone.
 */
server.registerTool(
  "propose_action",
  {
    description:
      "Submit an agent action to AgentGate for human approval before execution. " +
      "Returns an action_id the agent uses to poll check_action_status.",
    inputSchema: ProposeActionInputSchema,
  },
  async (rawInput): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
    // --- 1. Validate input ---
    const parseResult = ProposeActionInputSchema.safeParse(rawInput);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");

      const result: InterceptorResult = {
        success: false,
        action_id: null,
        status: "BLOCKED",
        error: `Invalid action: ${errorMessages}`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    // --- 2. Normalize ---
    const action = buildProposedAction(parseResult.data);

    // --- 3. Store as PENDING ---
    addPending(action);

    // --- 4. Notify relay (stub until Task A6) ---
    // notifyRelay is called after the action is stored. If relay notification
    // fails, the action is still safely stored as PENDING — the interceptor
    // does not block on relay availability.
    try {
      await notifyRelay(action);
    } catch (err) {
      // Relay notification failure is logged but does not block the pipeline.
      // The agent can still poll check_action_status. This aligns with the
      // fail-closed principle: the action stays PENDING, never auto-approved.
      console.error(
        `[interceptor] relay notification failed for ${action.action_id}:`,
        err
      );
    }

    // --- 5. Return PENDING status to agent ---
    const result: InterceptorResult = {
      success: true,
      action_id: action.action_id,
      status: "PENDING",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---------------------------------------------------------------------------
// Tool: check_action_status
// ---------------------------------------------------------------------------

/**
 * check_action_status — Status polling for a previously proposed action.
 *
 * The agent calls this repeatedly until the status is no longer PENDING.
 * The relay server updates the store (via pendingStore.updateStatus) when
 * a phone decision arrives.
 *
 * Statuses the agent may receive:
 *   PENDING   — still waiting for human decision
 *   APPROVED  — human approved; agent should wait for EXECUTED confirmation
 *   DENIED    — human denied; agent must not attempt execution
 *   BLOCKED   — gate blocked the action; agent must not retry with same action
 *   EXECUTED  — action ran successfully
 */
server.registerTool(
  "check_action_status",
  {
    description:
      "Poll the current status of a previously proposed action. " +
      "Call repeatedly until status is no longer PENDING.",
    inputSchema: CheckStatusInputSchema,
  },
  async (rawInput): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
    // --- 1. Validate input ---
    const parseResult = CheckStatusInputSchema.safeParse(rawInput);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: `Invalid input: ${errorMessages}` },
              null,
              2
            ),
          },
        ],
      };
    }

    const { action_id } = parseResult.data;

    // --- 2. Look up the action ---
    const entry = getAction(action_id);

    if (!entry) {
      const result: ActionStatusResult = {
        action_id,
        status: "BLOCKED",
        reason: "action_id not found — it may have expired or never existed",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    // --- 3. Return current status ---
    const result: ActionStatusResult = {
      action_id: entry.action.action_id,
      status: entry.status,
      ...(entry.status === "BLOCKED" || entry.status === "DENIED"
        ? { reason: `Action ${entry.status.toLowerCase()} by AgentGate` }
        : {}),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

}

/**
 * Create an isolated interceptor server. Tests use this factory to exercise
 * the public MCP protocol without starting a stdio process.
 */
export function createInterceptorServer(): McpServer {
  const server = new McpServer({
    name: "agentgate-interceptor",
    version: "0.1.0",
  });
  registerTools(server);
  return server;
}

export const server = createInterceptorServer();

// ---------------------------------------------------------------------------
// Transport and startup
// ---------------------------------------------------------------------------

/**
 * Start the MCP interceptor with a stdio transport.
 *
 * stdio transport means: the agent connects by spawning this process as a
 * child process. Messages are exchanged over stdin/stdout. No network port
 * is opened by the interceptor itself.
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for the MCP protocol
  console.error("[interceptor] AgentGate MCP interceptor started (stdio)");
  console.error(
    "[interceptor] Tools available: propose_action, check_action_status"
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((err) => {
    console.error("[interceptor] Fatal startup error:", err);
    process.exit(1);
  });
}
