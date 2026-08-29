/**
 * credentialRegistry.ts — Laptop-side credential / public key registry
 *
 * The Execution Gate relies on local public keys registered during device pairing
 * (or provisioned for the authorized human approver device).
 *
 * CRITICAL SECURITY INVARIANT:
 * The Execution Gate independently validates signatures using public keys stored here.
 * It NEVER fetches an unauthenticated public key dynamically from the request or relay
 * without verification.
 *
 * References:
 *   - TEAM_EXECUTION_PLAN_FINAL.md (Task A3 — Execution Gate)
 *   - AgentGate_Judge_Submission.md (Section 10 — Authorization Protocol)
 */

export interface RegisteredCredential {
  readonly credential_id: string;
  readonly publicKeyPem: string;
  readonly deviceName?: string;
  readonly registered_at: string;
}

const registry = new Map<string, RegisteredCredential>();

/**
 * Register a public key for a credential ID.
 *
 * @param credential_id Unique identifier of the device credential
 * @param publicKeyPem Public key in PEM format (SPKI)
 * @param deviceName Optional friendly device name (e.g. "iQOO 12")
 */
export function registerCredential(
  credential_id: string,
  publicKeyPem: string,
  deviceName?: string
): RegisteredCredential {
  if (!credential_id || !credential_id.trim()) {
    throw new Error("credentialRegistry: credential_id must be non-empty");
  }
  if (!publicKeyPem || !publicKeyPem.trim()) {
    throw new Error("credentialRegistry: publicKeyPem must be non-empty");
  }

  const record: RegisteredCredential = {
    credential_id: credential_id.trim(),
    publicKeyPem: publicKeyPem.trim(),
    deviceName: deviceName?.trim(),
    registered_at: new Date().toISOString(),
  };

  registry.set(record.credential_id, record);
  return record;
}

/**
 * Retrieve the public key associated with a credential_id.
 */
export function getPublicKey(credential_id: string): string | undefined {
  return registry.get(credential_id)?.publicKeyPem;
}

/**
 * Check if a credential is registered.
 */
export function hasCredential(credential_id: string): boolean {
  return registry.has(credential_id);
}

/**
 * Retrieve all registered credentials (metadata only, for status queries).
 */
export function getAllCredentials(): readonly RegisteredCredential[] {
  return Array.from(registry.values());
}

/**
 * Clear the registry (used for test isolation).
 */
export function clearCredentials(): void {
  registry.clear();
}
