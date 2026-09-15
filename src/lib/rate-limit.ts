import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by TiDB so it works correctly across
 * serverless instances (no shared in-memory state to rely on).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
  };
}

/** Throws a plain Error with a rate-limit message if the limit is exceeded. */
export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const result = await checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new RateLimitError();
  }
}

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitError";
  }
}
