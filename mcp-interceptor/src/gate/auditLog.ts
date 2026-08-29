/**
 * auditLog.ts — Append-only SQLite audit trail for Execution Gate attempts
 *
 * Every gate evaluation attempt (both ALLOW and BLOCK outcomes) is recorded here.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. Must never store private keys, secrets, or sensitive credentials.
 * 2. Every gate attempt MUST produce an audit record to establish non-repudiation.
 * 3. Failures in logging should fail closed or be surfaced immediately.
 *
 * References:
 *   - TEAM_EXECUTION_PLAN_FINAL.md (Task A3)
 *   - AgentGate_Judge_Submission.md (Section 7, Section 10)
 */

import { DatabaseSync } from "node:sqlite";
import type { AuditLogRecord } from "../types.js";

let defaultDb: DatabaseSync | null = null;

/**
 * Initialize or get the active SQLite database instance.
 *
 * Defaults to an in-memory SQLite database or a local file.
 */
export function getAuditDb(customPath: string = ":memory:"): DatabaseSync {
  if (!defaultDb) {
    defaultDb = new DatabaseSync(customPath);
    initAuditSchema(defaultDb);
  }
  return defaultDb;
}

/**
 * Initialize the audit table schema.
 */
export function initAuditSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gate_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_id TEXT NOT NULL,
      command TEXT NOT NULL,
      target TEXT NOT NULL,
      decision TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      credential_id TEXT,
      timestamp TEXT NOT NULL
    );
  `);
}

/**
 * Record a gate attempt in the SQLite audit log.
 */
export function recordGateAttempt(
  record: Omit<AuditLogRecord, "id">,
  db: DatabaseSync = getAuditDb()
): void {
  const insertStmt = db.prepare(`
    INSERT INTO gate_audit_log (
      action_id,
      command,
      target,
      decision,
      status,
      reason,
      credential_id,
      timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    record.action_id,
    record.command,
    record.target,
    record.decision,
    record.status,
    record.reason,
    record.credential_id ?? null,
    record.timestamp
  );
}

/**
 * Retrieve recent audit log records.
 */
export function getAuditLogs(
  limit: number = 100,
  db: DatabaseSync = getAuditDb()
): AuditLogRecord[] {
  const query = db.prepare(`
    SELECT
      id,
      action_id,
      command,
      target,
      decision,
      status,
      reason,
      credential_id,
      timestamp
    FROM gate_audit_log
    ORDER BY id DESC
    LIMIT ?
  `);

  return query.all(limit) as unknown as AuditLogRecord[];
}

/**
 * Retrieve audit log records for a specific action_id.
 */
export function getAuditLogsByActionId(
  action_id: string,
  db: DatabaseSync = getAuditDb()
): AuditLogRecord[] {
  const query = db.prepare(`
    SELECT
      id,
      action_id,
      command,
      target,
      decision,
      status,
      reason,
      credential_id,
      timestamp
    FROM gate_audit_log
    WHERE action_id = ?
    ORDER BY id ASC
  `);

  return query.all(action_id) as unknown as AuditLogRecord[];
}

/**
 * Clear the audit log (used in tests for clean isolation).
 */
export function clearAuditLog(db: DatabaseSync = getAuditDb()): void {
  db.exec("DELETE FROM gate_audit_log;");
}

/**
 * Close the audit database connection.
 */
export function closeAuditDb(): void {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
  }
}
