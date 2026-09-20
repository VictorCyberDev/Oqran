import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { simulateNinAddressMatch } from "@/lib/simulation";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { haversineDistanceKm, scoreLocationRisk } from "@/lib/geo/risk-score";
import { resolvePlace, resolveFailureMessage } from "@/lib/geo/resolve-place";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z
  .object({
    query: z.string().min(3).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    nin: z.string().regex(/^\d{11}$/, "NIN must be 11 digits").optional(),
  })
  .refine((b) => b.query || (b.latitude !== undefined && b.longitude !== undefined), {
    message: "Provide a search query or a location",
  });

const EXISTING_ADDRESS_MATCH_RADIUS_KM = 0.05;
const RISK_SEARCH_RADIUS_KM = 2;
const RECENT_INCIDENT_WINDOW_DAYS = 180;

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "GOVERNMENT") return jsonError(403, "Not authorized");

  await enforceRateLimit(`gov:investigate:user:${session.userId}`, 60, 10 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  // A text search resolves through OQRAN's own records first and OSM
  // geocoding second, so a street we hold nothing on still lands on the
  // map instead of returning an error that reads as a broken search.
  const outcome = body.query ? await resolvePlace(body.query) : null;
  const resolved = outcome?.ok ? outcome.place : null;

  if (outcome && !outcome.ok && body.latitude === undefined) {
    return NextResponse.json({ ok: false, error: resolveFailureMessage(outcome.reason) });
  }

  let address = resolved?.addressId
    ? await db.address.findUnique({ where: { id: resolved.addressId } })
    : null;

  const lat = body.latitude ?? resolved?.latitude;
  const lon = body.longitude ?? resolved?.longitude;

  if (!address && lat !== undefined && lon !== undefined) {
    const candidates = await db.address.findMany({
      where: {
        latitude: { gte: lat - 0.01, lte: lat + 0.01 },
        longitude: { gte: lon - 0.01, lte: lon + 0.01 },
      },
    });
    const nearest = candidates
      .map((a) => ({ a, d: haversineDistanceKm(lat, lon, a.latitude, a.longitude) }))
      .sort((x, y) => x.d - y.d)[0];
    if (nearest && nearest.d <= EXISTING_ADDRESS_MATCH_RADIUS_KM) address = nearest.a;
  }

  /** Whether OQRAN already held this place before this lookup. Drives a
   * distinct pin and panel state for "nothing on file here". */
  const hadRecord = address !== null;

  if (!address) {
    if (lat === undefined || lon === undefined) {
      return NextResponse.json({
        ok: false,
        error: "Couldn't locate that place. Try a fuller address, or click a point on the map.",
      });
    }
    address = await db.address.create({
      data: {
        label: resolved?.label ?? body.query ?? "Investigator-marked location",
        latitude: lat,
        longitude: lon,
        confidenceTier: "CROWD_REPORTED",
        source: body.query
          ? "Geocoded from an investigator search — no prior OQRAN record"
          : "Marked directly on the map by a government investigator",
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

  let ninResult: { matched: boolean } | undefined;

  const data: { severity: typeof severity; confidenceTier?: "NIMC_CERTIFIED"; source?: string } = {
    severity,
  };

  if (body.nin) {
    const matched = simulateNinAddressMatch(body.nin, address.id);
    ninResult = { matched };
    if (matched) {
      data.confidenceTier = "NIMC_CERTIFIED";
      data.source = "NIN cross-reference matched (simulated) — pending NIMC API access";
    }
  }

  address = await db.address.update({ where: { id: address.id }, data });

  await logActivity({
    userId: session.userId,
    action: "INVESTIGATOR_LOCATION_CHECKED",
    description: address.label,
  });

  return NextResponse.json({
    ok: true,
    hadRecord,
    address: {
      id: address.id,
      label: address.label,
      latitude: address.latitude,
      longitude: address.longitude,
      confidenceTier: address.confidenceTier,
      source: address.source,
      severity: address.severity,
      riskScore: score,
    },
    ninResult,
  });
});
