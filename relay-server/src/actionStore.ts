import { DatabaseSync } from "node:sqlite";
import type { AuthorizationToken, ProposedAction, RelayAction } from "./types.js";

export class ActionStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS actions (
        action_id TEXT PRIMARY KEY,
        action_json TEXT NOT NULL,
        action_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        authorization_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS actions_status_updated_idx
      ON actions(status, updated_at DESC);
    `);
  }

  create(action: ProposedAction): RelayAction {
    const timestamp = new Date().toISOString();
    try {
      this.db
        .prepare(
          `INSERT INTO actions (action_id, action_json, action_hash, status, created_at, updated_at)
           VALUES (?, ?, ?, 'PENDING', ?, ?)`
        )
        .run(
          action.action_id,
          JSON.stringify(action),
          action.action_hash,
          timestamp,
          timestamp
        );
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
        throw new Error("Action already exists");
      }
      throw error;
    }
    return { action, status: "PENDING", updated_at: timestamp };
  }

  get(actionId: string): RelayAction | undefined {
    const row = this.db
      .prepare(
        `SELECT action_json, status, authorization_json, updated_at
         FROM actions WHERE action_id = ?`
      )
      .get(actionId) as
      | {
          action_json: string;
          status: RelayAction["status"];
          authorization_json: string | null;
          updated_at: string;
        }
      | undefined;

    if (!row) return undefined;
    return {
      action: JSON.parse(row.action_json) as ProposedAction,
      status: row.status,
      updated_at: row.updated_at,
      ...(row.authorization_json
        ? { authorization: JSON.parse(row.authorization_json) as AuthorizationToken }
        : {}),
    };
  }

  listPending(): RelayAction[] {
    const rows = this.db
      .prepare(
        `SELECT action_json, status, authorization_json, updated_at
         FROM actions WHERE status = 'PENDING' ORDER BY updated_at ASC`
      )
      .all() as Array<{
      action_json: string;
      status: RelayAction["status"];
      authorization_json: string | null;
      updated_at: string;
    }>;
    return rows.map((row) => ({
      action: JSON.parse(row.action_json) as ProposedAction,
      status: row.status,
      updated_at: row.updated_at,
    }));
  }

  resolve(actionId: string, authorization: AuthorizationToken): RelayAction {
    const current = this.get(actionId);
    if (!current) throw new Error("Action not found");
    if (current.status !== "PENDING") throw new Error("Action is already resolved");

    const status = authorization.decision === "approved" ? "APPROVED" : "DENIED";
    const timestamp = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE actions SET status = ?, authorization_json = ?, updated_at = ?
         WHERE action_id = ? AND status = 'PENDING'`
      )
      .run(status, JSON.stringify(authorization), timestamp, actionId);

    return { action: current.action, status, authorization, updated_at: timestamp };
  }

  close(): void {
    this.db.close();
  }
}
