import "server-only";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";

/** Authenticates a request bearing `Authorization: Bearer oqr_live_...`.
 * The key prefix narrows the DB lookup so we're not bcrypt-comparing
 * against every issued key on each request. */
export async function authenticateApiKey(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const key = auth.slice("Bearer ".length).trim();
  if (!key.startsWith("oqr_live_") || key.length < 20) return null;

  const prefix = key.slice(0, 14);
  const candidates = await db.apiClient.findMany({
    where: { apiKeyPrefix: prefix, status: "ACTIVE" },
  });

  for (const candidate of candidates) {
    if (await bcrypt.compare(key, candidate.apiKeyHash)) {
      return candidate;
    }
  }
  return null;
}

export function hasScope(scopes: string, scope: string): boolean {
  return scopes.split(",").map((s) => s.trim()).includes(scope);
}
