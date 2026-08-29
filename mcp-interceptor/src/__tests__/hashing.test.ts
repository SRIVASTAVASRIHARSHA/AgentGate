import { describe, expect, it } from "vitest";
import { canonicalizeAction } from "../hashing/canonicalize.js";
import { hashAction } from "../hashing/hash.js";
import type { ActionPayload } from "../types.js";

describe("action canonicalization and hashing", () => {
  it("produces the same canonical payload and hash despite parameter key order", () => {
    const first: ActionPayload = {
      type: "git",
      command: "git push origin main",
      target: "origin/main",
      params: { force: false, branch: "main", nested: { z: 1, a: true } },
    };
    const second: ActionPayload = {
      type: "git",
      command: "git push origin main",
      target: "origin/main",
      params: { nested: { a: true, z: 1 }, branch: "main", force: false },
    };

    expect(canonicalizeAction(first)).toBe(canonicalizeAction(second));
    expect(hashAction(first)).toBe(hashAction(second));
  });

  it("changes the hash when any semantic action field changes", () => {
    const safe: ActionPayload = {
      type: "shell",
      command: "rm -rf /safe/dir",
      target: "/safe/dir",
      params: {},
    };
    const dangerous: ActionPayload = {
      ...safe,
      command: "rm -rf /critical/production/data",
    };

    expect(hashAction(safe)).not.toBe(hashAction(dangerous));
  });
});
