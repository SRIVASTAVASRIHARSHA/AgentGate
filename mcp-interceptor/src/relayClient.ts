/**
 * relayClient.ts — Interface boundary for the relay-server connection
 *
 * The relay-server (relay-server/ package) is not yet implemented.
 * This module defines the clean interface the interceptor will call when
 * forwarding a pending action to the relay for phone delivery.
 *
 * CURRENT STATE: stub only — notifyRelay() logs and returns immediately.
 * No invented relay API is called here.
 *
 * When relay-server/ is implemented (Task A6), the stub body will be
 * replaced with a real HTTP POST to the relay's /actions endpoint.
 * The interceptor (interceptor.ts) calls notifyRelay() and does not need
 * to change when the real implementation is wired in.
 *
 * See relay-server/README.md for the planned API surface.
 */

import type { ProposedAction } from "./types.js";

/**
 * Notify the relay server that a new action is pending approval.
 *
 * Currently a no-op stub. The action is already stored in pendingStore
 * before this is called — the interceptor does not depend on relay
 * availability to record the action.
 *
 * Future implementation:
 *   POST relay/actions { action }
 *   → relay stores the action and pushes action:new to the phone via Socket.IO
 */
export async function notifyRelay(action: ProposedAction): Promise<void> {
  // STUB: relay-server is not yet implemented (Task A6).
  // When implemented, this will POST to the relay's /actions endpoint.
  console.log(
    `[relayClient] STUB: would forward action ${action.action_id} to relay-server`
  );
  console.log(
    `[relayClient] STUB: action type="${action.payload.type}" command="${action.payload.command}" target="${action.payload.target}"`
  );
}
