/**
 * relayClient.ts — Interface boundary for the relay-server connection
 *
 * This module connects to the relay server to forward pending actions
 * and listens for resolution events (approved/denied) from the phone.
 */

import { io, type Socket } from "socket.io-client";
import { updateStatus } from "./pendingStore.js";
import type { ProposedAction } from "./types.js";

let socket: Socket | null = null;
let relayUrl: string | null = null;
let relayToken: string | null = null;

/**
 * Initialize the connection to the relay server.
 * This sets up the Socket.IO client to listen for action resolution events.
 */
export function initRelayClient(): void {
  relayUrl = process.env.RELAY_SERVER_URL || "http://127.0.0.1:3001";
  relayToken = process.env.RELAY_LAPTOP_TOKEN || "";

  if (!relayToken) {
    console.error("[relayClient] WARNING: RELAY_LAPTOP_TOKEN is not set. Relay connection will fail.");
  }

  socket = io(relayUrl, {
    auth: { token: relayToken },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.error(`[relayClient] connected to relay at ${relayUrl}`);
  });

  socket.on("connect_error", (err) => {
    console.error("[relayClient] connection error:", err.message);
  });

  // Listen for actions resolved by the phone
  socket.on("action:resolved", (relayAction: any) => {
    try {
      const action_id = relayAction?.action?.action_id;
      const status = relayAction?.status;
      if (action_id && status) {
        updateStatus(action_id, status);
        console.error(`[relayClient] updated action ${action_id} to ${status}`);
      }
    } catch (err) {
      console.error("[relayClient] error processing action:resolved event:", err);
    }
  });
}

/**
 * Notify the relay server that a new action is pending approval.
 * Posts the action to the relay's /actions endpoint.
 */
export async function notifyRelay(action: ProposedAction): Promise<void> {
  // If not initialized, fallback to stub behavior
  if (!relayUrl || !relayToken) {
    console.error(
      `[relayClient] STUB: would forward action ${action.action_id} to relay-server (client not initialized)`
    );
    return;
  }

  try {
    const response = await fetch(`${relayUrl}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${relayToken}`,
      },
      body: JSON.stringify(action),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[relayClient] failed to forward ${action.action_id} to relay: ${response.status} ${text}`
      );
      throw new Error(`Relay rejected with status ${response.status}`);
    }

    console.error(`[relayClient] successfully forwarded action ${action.action_id} to relay`);
  } catch (err) {
    console.error(`[relayClient] failed to reach relay for action ${action.action_id}:`, err);
    throw err;
  }
}
