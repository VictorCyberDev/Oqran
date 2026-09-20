import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey, hasScope } from "@/lib/auth/api-key";
import { enforceRateLimit } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";
import { simulateNinIdentity } from "@/lib/simulation";

/**
 * Public developer API — same open-CORS, API-key-gated shape as the
 * address lookup. Every response carries `simulated: true` and a
 * `provenance` line, so an integrator can't mistake this for a live NIMC
 * lookup even if they never read the docs.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const PROVENANCE = "Simulated — deterministic stand-in, pending NIMC API access";

function corsError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const GET = withErrorHandling(async (req) => {
  const client = await authenticateApiKey(req);
  if (!client) return corsError(401, "Invalid or missing API key");
  if (!hasScope(client.scopes, "read:identity")) {
    return corsError(403, "Key lacks read:identity scope");
  }

  await enforceRateLimit(`api:v1:identity:${client.id}`, 60, 60 * 1000);

  const nin = new URL(req.url).searchParams.get("nin");
  if (!nin || !/^\d{11}$/.test(nin)) {
    return corsError(400, "Provide an 11-digit `nin` query param");
  }

  const identity = simulateNinIdentity(nin);

  await db.apiUsage.create({
    data: { apiClientId: client.id, endpoint: "/api/v1/identity/cross-reference", statusCode: 200 },
  });

  return NextResponse.json(
    {
      ok: true,
      simulated: true,
      provenance: PROVENANCE,
      identity: {
        status: identity.status,
        holderRef: identity.holderRef,
        watchlistRef: identity.watchlistRef ?? null,
        otherInstitutionQueries7d: identity.otherInstitutionQueries7d,
      },
    },
    { headers: CORS_HEADERS }
  );
}, CORS_HEADERS);
