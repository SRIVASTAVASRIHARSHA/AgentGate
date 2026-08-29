/**
 * Deterministic serialization for the semantic action payload.
 *
 * This deliberately excludes action instance metadata such as action_id and
 * timestamps. Only a change to what will be executed changes the result.
 */
import type { ActionPayload } from "../types.js";

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError("Action payload contains a non-finite number");
      }
      return JSON.stringify(value);
    case "object":
      if (Array.isArray(value)) {
        return `[${value.map(canonicalizeValue).join(",")}]`;
      }

      {
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record).sort();
        return `{${keys
          .map((key) => `${JSON.stringify(key)}:${canonicalizeValue(record[key])}`)
          .join(",")}}`;
      }
    default:
      throw new TypeError(
        `Action payload contains unsupported value type: ${typeof value}`
      );
  }
}

/** Return stable UTF-8-safe JSON for an action's semantic payload. */
export function canonicalizeAction(payload: ActionPayload): string {
  return canonicalizeValue({
    command: payload.command,
    params: payload.params,
    target: payload.target,
    type: payload.type,
  });
}
