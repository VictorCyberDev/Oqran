import "server-only";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import { haversineDistanceKm, scoreLocationRisk } from "@/lib/geo/risk-score";
import { computeTrend, type Trend } from "@/lib/geo/trend";
import type { RiskSeverity } from "@/generated/prisma/enums";

const RECENT_WINDOW_DAYS = 45;
const TOTAL_WINDOW_DAYS = 90;

export interface ZoneRisk {
  severity: RiskSeverity;
  incidents90d: number;
  trend: Trend;
  /** Type and age of each incident in range, so callers can render a
   * plain-language summary without re-running the query. */
  incidents: { type: string; ageDays: number }[];
}

export async function computeZoneRisk(zone: {
  latitude: number;
  longitude: number;
  radiusKm: number;
}): Promise<ZoneRisk> {
  const boundingDeg = zone.radiusKm / 100; // ~1 degree ≈ 100km, generous prefilter box
  const candidates = await db.incident.findMany({
    where: {
      latitude: { gte: zone.latitude - boundingDeg, lte: zone.latitude + boundingDeg },
      longitude: { gte: zone.longitude - boundingDeg, lte: zone.longitude + boundingDeg },
      createdAt: { gte: daysAgo(TOTAL_WINDOW_DAYS) },
    },
  });

  const within = candidates.filter(
    (i) =>
      i.latitude !== null &&
      i.longitude !== null &&
      haversineDistanceKm(zone.latitude, zone.longitude, i.latitude, i.longitude) <= zone.radiusKm
  );

  const recentCutoff = daysAgo(RECENT_WINDOW_DAYS);
  const recentCount = within.filter((i) => i.createdAt >= recentCutoff).length;
  const priorCount = within.length - recentCount;

  const { severity } = scoreLocationRisk(
    zone,
    within.map((i) => ({
      latitude: i.latitude!,
      longitude: i.longitude!,
      severity: i.severity,
      ageDays: (Date.now() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000),
    })),
    zone.radiusKm
  );

  return {
    severity,
    incidents90d: within.length,
    trend: computeTrend(recentCount, priorCount),
    incidents: within.map((i) => ({
      type: i.type,
      ageDays: (Date.now() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000),
    })),
  };
}
