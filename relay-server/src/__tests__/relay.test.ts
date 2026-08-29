import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createRelayServer, type RelayServer } from "../relay.js";
import type { AuthorizationToken, ProposedAction, RelayAction } from "../types.js";

const laptopToken = "laptop-test-token-7f66a06e";
const phoneToken = "phone-test-token-c32245ef";

function action(): ProposedAction {
  return {
    action_id: "123e4567-e89b-42d3-a456-426614174000",
    action_hash: "a".repeat(64),
    payload: {
      type: "shell",
      command: "rm -rf ./demo-output",
      target: "/workspace/demo-output",
      params: { recursive: true },
    },
    proposed_at: "2026-08-29T10:00:00.000Z",
  };
}

function authorization(proposed: ProposedAction, decision: "approved" | "denied" = "approved"): AuthorizationToken {
  return {
    action_id: proposed.action_id,
    action_hash: proposed.action_hash,
    decision,
    credential_id: "phone-credential-001",
    signature: "opaque-webauthn-assertion-to-be-verified-by-a2",
    signed_at: "2026-08-29T10:01:00.000Z",
  };
}

function waitForEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2_000);
    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

describe("AgentGate relay", () => {
  let relay: RelayServer;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeEach(async () => {
    relay = createRelayServer({
      dbPath: ":memory:",
      laptopToken,
      phoneToken,
      allowedOrigin: "*",
    });
    const port = await relay.listen(0);
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    for (const socket of sockets) socket.close();
    sockets.length = 0;
    await relay.close();
  });

  async function connect(token: string): Promise<Socket> {
    const socket = io(baseUrl, { auth: { token }, transports: ["websocket"] });
    sockets.push(socket);
    await waitForEvent<void>(socket, "connect");
    return socket;
  }

  it("requires separate role tokens for protected APIs", async () => {
    const response = await fetch(`${baseUrl}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action()),
    });
    expect(response.status).toBe(401);
  });

  it("pushes new actions to phones and resolved decisions to laptops", async () => {
    const phone = await connect(phoneToken);
    const laptop = await connect(laptopToken);
    const newAction = waitForEvent<RelayAction>(phone, "action:new");
    const resolvedAction = waitForEvent<RelayAction>(laptop, "action:resolved");

    const proposed = action();
    const createResponse = await fetch(`${baseUrl}/actions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${laptopToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(proposed),
    });
    expect(createResponse.status).toBe(201);
    expect((await newAction).action.action_id).toBe(proposed.action_id);

    const responseToken = authorization(proposed);
    const response = await fetch(`${baseUrl}/actions/${proposed.action_id}/respond`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${phoneToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(responseToken),
    });
    expect(response.status).toBe(200);
    expect((await resolvedAction).status).toBe("APPROVED");

    const pollResponse = await fetch(`${baseUrl}/actions/${proposed.action_id}`, {
      headers: { authorization: `Bearer ${laptopToken}` },
    });
    expect(pollResponse.status).toBe(200);
    expect((await pollResponse.json() as RelayAction).status).toBe("APPROVED");
  });

  it("rejects a response with a hash that is not the exact stored action", async () => {
    const proposed = action();
    await fetch(`${baseUrl}/actions`, {
      method: "POST",
      headers: { authorization: `Bearer ${laptopToken}`, "content-type": "application/json" },
      body: JSON.stringify(proposed),
    });

    const tampered = { ...authorization(proposed), action_hash: "b".repeat(64) };
    const response = await fetch(`${baseUrl}/actions/${proposed.action_id}/respond`, {
      method: "POST",
      headers: { authorization: `Bearer ${phoneToken}`, "content-type": "application/json" },
      body: JSON.stringify(tampered),
    });

    expect(response.status).toBe(400);
    expect(relay.store.get(proposed.action_id)?.status).toBe("PENDING");
  });
});
