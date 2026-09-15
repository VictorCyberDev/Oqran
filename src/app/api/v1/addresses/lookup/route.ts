import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey, hasScope } from "@/lib/auth/api-key";
import { enforceRateLimit } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";

/**
 * Public developer API — deliberately open CORS (any origin may call it),
 * gated by the caller's own API key rather than same-origin/cookie auth.
 * Internal app routes under /api/** stay same-origin: no CORS headers
 * there means browsers block cross-site calls by default. Every response
 * here, including error paths, carries the CORS headers — an error
 * response missing them would be opaque to the calling browser.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function corsError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export const GET = withErrorHandling(async (req) => {
  const client = await authenticateApiKey(req);
  if (!client) return corsError(401, "Invalid or missing API key");
  if (!hasScope(client.scopes, "read:addresses")) {
    return corsError(403, "Key lacks read:addresses scope");
  }

  await enforceRateLimit(`api:v1:addresses:${client.id}`, 60, 60 * 1000);

  const url = new URL(req.url);
  const label = url.searchParams.get("label");
  if (!label || label.length < 3) {
    return corsError(400, "Provide a `label` query param (min 3 chars)");
  }

  const address = await db.address.findFirst({ where: { label: { contains: label } } });

  await db.apiUsage.create({
    data: {
      apiClientId: client.id,
      endpoint: "/api/v1/addresses/lookup",
      statusCode: address ? 200 : 404,
    },
  });

  if (!address) return corsError(404, "No match");

  return NextResponse.json(
    {
      ok: true,
      address: {
        label: address.label,
        confidenceTier: address.confidenceTier,
        severity: address.severity,
        postcode: address.postcode,
        zoneType: address.zoneType,
      },
    },
    { headers: CORS_HEADERS }
  );
}, CORS_HEADERS);
