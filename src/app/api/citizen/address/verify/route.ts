import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { haversineDistanceKm, scoreLocationRisk } from "@/lib/geo/risk-score";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z
  .object({
    query: z.string().min(3).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    claim: z.boolean().optional(),
  })
  .refine((b) => b.query || (b.latitude !== undefined && b.longitude !== undefined), {
    message: "Provide a search query or a location",
  });

const EXISTING_ADDRESS_MATCH_RADIUS_KM = 0.05;
const RISK_SEARCH_RADIUS_KM = 2;
const RECENT_INCIDENT_WINDOW_DAYS = 180;

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  await enforceRateLimit(`address:verify:user:${session.userId}`, 20, 10 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  let address = body.query
    ? await db.address.findFirst({
        where: { label: { contains: body.query } },
      })
    : null;

  if (!address && body.latitude !== undefined && body.longitude !== undefined) {
    const candidates = await db.address.findMany({
      where: {
        latitude: { gte: body.latitude - 0.01, lte: body.latitude + 0.01 },
        longitude: { gte: body.longitude - 0.01, lte: body.longitude + 0.01 },
      },
    });
    const nearest = candidates
      .map((a) => ({ a, d: haversineDistanceKm(body.latitude!, body.longitude!, a.latitude, a.longitude) }))
      .sort((x, y) => x.d - y.d)[0];
    if (nearest && nearest.d <= EXISTING_ADDRESS_MATCH_RADIUS_KM) address = nearest.a;
  }

  if (!address) {
    if (body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json({
        ok: false,
        error:
          "No record found for that address. Try 'Use my current location', or check the spelling.",
      });
    }
    address = await db.address.create({
      data: {
        label: body.query ?? "Current location",
        latitude: body.latitude,
        longitude: body.longitude,
        confidenceTier: "CROWD_REPORTED",
        source: "User-submitted current location — unverified",
      },
    });
  }

  const nearbyIncidents = await db.incident.findMany({
    where: {
      latitude: { gte: address.latitude - 0.02, lte: address.latitude + 0.02 },
      longitude: { gte: address.longitude - 0.02, lte: address.longitude + 0.02 },
      createdAt: { gte: new Date(Date.now() - RECENT_INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
    },
  });

  const { severity, score } = scoreLocationRisk(
    address,
    nearbyIncidents
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => ({
        latitude: i.latitude!,
        longitude: i.longitude!,
        severity: i.severity,
        ageDays: (Date.now() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      })),
    RISK_SEARCH_RADIUS_KM
  );

  address = await db.address.update({
    where: { id: address.id },
    data: {
      severity,
      verifiedById: body.claim ? session.userId : address.verifiedById,
    },
  });

  if (body.claim) {
    await appendLedgerEntry({
      kind: "ADDRESS_VERIFIED",
      addressId: address.id,
      verifiedById: session.userId,
      confidenceTier: address.confidenceTier,
      severity: address.severity,
    });
    await logActivity({
      userId: session.userId,
      action: "ADDRESS_VERIFIED",
      description: address.label,
    });
  }

  return NextResponse.json({
    ok: true,
    address: {
      id: address.id,
      label: address.label,
      confidenceTier: address.confidenceTier,
      source: address.source,
      postcode: address.postcode,
      zoneType: address.zoneType,
      severity: address.severity,
      riskScore: score,
    },
  });
});
