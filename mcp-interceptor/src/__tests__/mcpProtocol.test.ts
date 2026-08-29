import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { clearStore, updateStatus } from "../pendingStore.js";
import { createInterceptorServer } from "../interceptor.js";

function textResult(result: unknown): Record<string, unknown> {
  const content = (result as { content?: Array<{ type: string; text?: string }> })
    .content;
  const first = content?.[0];
  if (!first || first.type !== "text" || !first.text) {
    throw new Error("Expected a text MCP tool result");
  }
  return JSON.parse(first.text) as Record<string, unknown>;
}

describe("AgentGate MCP protocol", () => {
  let client: Client;

  beforeEach(async () => {
    clearStore();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createInterceptorServer();
    client = new Client({ name: "agentgate-test-client", version: "1.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    clearStore();
    await client.close();
  });

  it("exposes only proposal and status-polling tools", async () => {
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "check_action_status",
      "propose_action",
    ]);
  });

  it("accepts a proposal over MCP, stores it as pending, and reports later status changes", async () => {
    const proposal = textResult(
      await client.callTool({
        name: "propose_action",
        arguments: {
          type: "shell",
          command: "rm -rf ./demo-output",
          target: "/workspace/demo-output",
          params: { recursive: true },
        },
      })
    );

    expect(proposal.success).toBe(true);
    expect(proposal.status).toBe("PENDING");
    expect(proposal.action_id).toEqual(expect.any(String));

    const actionId = proposal.action_id as string;
    updateStatus(actionId, "DENIED");

    const status = textResult(
      await client.callTool({
        name: "check_action_status",
        arguments: { action_id: actionId },
      })
    );

    expect(status).toMatchObject({
      action_id: actionId,
      status: "DENIED",
    });
  });

  it("fails closed for an unknown action ID", async () => {
    const status = textResult(
      await client.callTool({
        name: "check_action_status",
        arguments: { action_id: "00000000-0000-4000-8000-000000000000" },
      })
    );

    expect(status).toMatchObject({ status: "BLOCKED" });
  });
});
