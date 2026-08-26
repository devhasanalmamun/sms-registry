/**
 * The shape every Server Action returns.
 *
 * Kept in its own module because a "use server" file may only export async
 * functions — a plain constant like `IDLE` cannot live alongside the actions.
 */
export type ActionState = {
  ok: boolean;
  /** A whole-form message: a success confirmation, or a failure that is not tied to one field. */
  message?: string;
  /** Field-level messages, keyed by input name, rendered beside the input. */
  errors?: Record<string, string>;
};

export const IDLE: ActionState = { ok: false };
