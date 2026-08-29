import { z } from "zod";

const ActionTypeSchema = z.enum([
  "shell",
  "sql",
  "file",
  "git",
  "network",
  "deploy",
  "unknown",
]);

export const ProposedActionSchema = z
  .object({
    action_id: z.string().uuid(),
    action_hash: z.string().regex(/^[a-f0-9]{64}$/),
    payload: z
      .object({
        type: ActionTypeSchema,
        command: z.string().min(1).max(16_384),
        target: z.string().min(1).max(4_096),
        params: z.record(z.string(), z.unknown()),
      })
      .strict(),
    proposed_at: z.string().datetime(),
  })
  .strict();

export const AuthorizationTokenSchema = z
  .object({
    action_id: z.string().uuid(),
    action_hash: z.string().regex(/^[a-f0-9]{64}$/),
    decision: z.enum(["approved", "denied"]),
    credential_id: z.string().min(1).max(512),
    signature: z.string().min(1).max(16_384),
    signed_at: z.string().datetime(),
  })
  .strict();

export type ProposedAction = z.infer<typeof ProposedActionSchema>;
export type AuthorizationToken = z.infer<typeof AuthorizationTokenSchema>;
export type ActionStatus = "PENDING" | "APPROVED" | "DENIED";

export interface RelayAction {
  readonly action: ProposedAction;
  readonly status: ActionStatus;
  readonly updated_at: string;
  readonly authorization?: AuthorizationToken;
}
