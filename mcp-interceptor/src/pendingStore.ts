/**
 * pendingStore.ts — In-memory store for pending AgentGate actions
 *
 * Holds the state of every proposed action from the moment it enters the
 * interceptor until it reaches a terminal status (APPROVED, DENIED, BLOCKED,
 * EXECUTED).
 *
 * Current implementation: in-memory only. The relay-server will eventually
 * read from this store (or its SQLite equivalent) when forwarding actions to
 * the phone. The relayClient interface boundary allows the relay connection
 * to be wired in without changing this module.
 *
 * NOT YET IMPLEMENTED: SQLite persistence (planned for when the relay is built).
 */

import type { ActionStatus, PendingAction, ProposedAction } from "./types.js";

/**
 * The pending-action store.
 *
 * Maps action_id → PendingAction.
 * Keyed by action_id so lookups from both the interceptor and the relay are O(1).
 */
const store = new Map<string, PendingAction>();

/**
 * Add a newly proposed action to the store with status PENDING.
 *
 * Called by the interceptor immediately after validating and normalizing
 * the raw MCP tool input.
 *
 * @throws if an action with the same action_id already exists
 *         (indicates a UUID collision — should never happen in practice)
 */
export function addPending(action: ProposedAction): PendingAction {
  if (store.has(action.action_id)) {
    throw new Error(
      `pendingStore: action_id collision — ${action.action_id} already exists`
    );
  }

  const entry: PendingAction = {
    action,
    status: "PENDING",
    updated_at: new Date().toISOString(),
  };

  store.set(action.action_id, entry);
  return entry;
}

/**
 * Retrieve a pending action by its ID.
 *
 * Returns undefined if the action does not exist.
 * Callers must handle the undefined case — do not assume the action exists.
 */
export function getAction(action_id: string): PendingAction | undefined {
  return store.get(action_id);
}

/**
 * Update the status of an existing pending action.
 *
 * Called by the relay client when a decision arrives from the phone,
 * and by the execution gate when it executes or blocks.
 *
 * @throws if the action does not exist in the store
 */
export function updateStatus(action_id: string, status: ActionStatus): PendingAction {
  const entry = store.get(action_id);
  if (!entry) {
    throw new Error(
      `pendingStore: cannot update status — action_id ${action_id} not found`
    );
  }

  entry.status = status;
  entry.updated_at = new Date().toISOString();
  return entry;
}

/**
 * Return all actions currently in the store.
 * Used for debugging and future audit/history endpoint.
 */
export function getAllActions(): PendingAction[] {
  return Array.from(store.values());
}

/**
 * Remove a single action from the store.
 * Used in tests to isolate state between test cases.
 */
export function removeAction(action_id: string): void {
  store.delete(action_id);
}

/**
 * Clear the entire store.
 * Used in tests only — never in production code paths.
 */
export function clearStore(): void {
  store.clear();
}
