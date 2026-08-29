import crypto from "node:crypto";
import { canonicalizeAction } from "./canonicalize.js";
import type { ActionPayload } from "../types.js";

/** SHA-256 fingerprint of the canonical semantic action payload, as lowercase hex. */
export function hashAction(payload: ActionPayload): string {
  return crypto
    .createHash("sha256")
    .update(canonicalizeAction(payload), "utf8")
    .digest("hex");
}
