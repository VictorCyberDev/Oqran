import "server-only";
import { z } from "zod";

/**
 * A write replayed from the offline queue may already have succeeded with
 * only the response lost. Every queue-eligible endpoint accepts this
 * optional client-generated id and treats a repeat of the same id as the
 * same write, so a reconnect can't turn one report into two.
 *
 * Optional, because the same endpoints are still called normally by
 * clients that were never offline.
 */
export const clientRequestIdSchema = z.string().min(8).max(64).optional();

/** Prisma's unique-constraint violation. Two replays racing each other can
 * both pass the pre-check and reach the insert; the loser lands here and
 * is treated as a duplicate rather than an error. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
