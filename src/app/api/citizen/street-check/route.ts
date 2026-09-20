import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { haversineDistanceKm, scoreLocationRisk } from "@/lib/geo/risk-score";
import { summariseIncidents, riskBandHeadline, riskBandAdvice } from "@/lib/geo/summary";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z
  .object({
    query: z.string().min(2).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((b) => b.query || (b.latitude !== undefined && b.longitude !== undefined), {
    message: "Search for a street or use your location",
  });

const RADIUS_KM = 2;
const WINDOW_DAYS = 180;
const SUMMARY_WINDOW_DAYS = 30;

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  await enforceRateLimit(`street-check:user:${session.userId}`, 60, 10 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  const match = body.query
    ? await db.address.findFirst({ where: { label: { contains: body.query } } })
    : null;

  const point = match
    ? { latitude: match.latitude, longitude: match.longitude }
    : body.latitude !== undefined && body.longitude !== undefined
      ? { latitude: body.latitude, longitude: body.longitude }
      : null;

  if (!point) {
    // Nothing matched and no coordinates to fall back on. Offer real
    // places from the dataset rather than a dead end.
    const suggestions = await db.address.findMany({
      select: { label: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    return NextResponse.json({
      ok: false,
      error: "We don't have records for that street yet.",
      suggestions: suggestions.map((s) => s.label),
    });
  }

  const nearby = await db.incident.findMany({
    where: {
      latitude: { gte: point.latitude - 0.03, lte: point.latitude + 0.03 },
      longitude: { gte: point.longitude - 0.03, lte: point.longitude + 0.03 },
      createdAt: { gte: new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000) },
    },
    // Reporter identity is deliberately never selected — a citizen
    // looking up a street must not be able to learn who reported what.
    select: { id: true, type: true, severity: true, latitude: true, longitude: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const within = nearby
    .filter((i) => i.latitude !== null && i.longitude !== null)
    .map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      createdAt: i.createdAt,
      distanceKm: haversineDistanceKm(point.latitude, point.longitude, i.latitude!, i.longitude!),
      ageDays: (Date.now() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000),
    }))
    .filter((i) => i.distanceKm <= RADIUS_KM);

  const { severity, score } = scoreLocationRisk(
    point,
    within.map((i) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      severity: i.severity,
      ageDays: i.ageDays,
    })),
    RADIUS_KM
  );

  const recent = within.filter((i) => i.ageDays <= SUMMARY_WINDOW_DAYS);

  await logActivity({
    userId: session.userId,
    action: "STREET_CHECKED",
    description: match?.label ?? `${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}`,
  });

  return NextResponse.json({
    ok: true,
    place: {
      label: match?.label ?? "Your current location",
      latitude: point.latitude,
      longitude: point.longitude,
      confidenceTier: match?.confidenceTier ?? null,
      addressId: match?.id ?? null,
    },
    risk: {
      severity,
      score,
      headline: riskBandHeadline(severity),
      advice: riskBandAdvice(severity),
      summary: summariseIncidents(
        within.map((i) => ({ type: i.type, ageDays: i.ageDays })),
        SUMMARY_WINDOW_DAYS
      ),
    },
    /** Aggregate only — how many separate reports corroborate this area. */
    confirmations: recent.length,
    timeline: within.slice(0, 12).map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      date: i.createdAt.toISOString(),
    })),
  });
});
