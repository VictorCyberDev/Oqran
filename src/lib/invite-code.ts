import { randomBytes } from "crypto";

/** Generates a fresh, unpredictable invite code — used for new
 * organizations (self-service Business org creation, and the seed
 * script's demo Bank/Government codes). */
export function freshInviteCode(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
