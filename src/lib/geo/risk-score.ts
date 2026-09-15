import type { RiskSeverity } from "@/generated/prisma/enums";

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in kilometers. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  LOW: 1,
  GUARDED: 2,
  ELEVATED: 4,
  CRITICAL: 8,
};

export interface NearbyIncident {
  latitude: number;
  longitude: number;
  severity: RiskSeverity;
  /** Days since the incident occurred. */
  ageDays: number;
}

export interface RiskScoreResult {
  score: number;
  severity: RiskSeverity;
  consideredCount: number;
}

const SEARCH_RADIUS_KM = 2;
const RECENCY_HALF_LIFE_DAYS = 30;

/**
 * Scores a point's risk from nearby incidents: closer, more recent, and more
 * severe incidents contribute more. Pure function — no I/O — so it is
 * unit-testable independent of the incidents query that feeds it.
 */
export function scoreLocationRisk(
  target: { latitude: number; longitude: number },
  incidents: NearbyIncident[],
  radiusKm: number = SEARCH_RADIUS_KM
): RiskScoreResult {
  let score = 0;
  let consideredCount = 0;

  for (const incident of incidents) {
    const distanceKm = haversineDistanceKm(
      target.latitude,
      target.longitude,
      incident.latitude,
      incident.longitude
    );
    if (distanceKm > radiusKm) continue;

    const distanceFactor = 1 - distanceKm / radiusKm;
    const recencyFactor = 1 / (1 + incident.ageDays / RECENCY_HALF_LIFE_DAYS);
    score += SEVERITY_WEIGHT[incident.severity] * distanceFactor * recencyFactor;
    consideredCount++;
  }

  let severity: RiskSeverity;
  if (score < 2) severity = "LOW";
  else if (score < 5) severity = "GUARDED";
  else if (score < 10) severity = "ELEVATED";
  else severity = "CRITICAL";

  return { score: Math.round(score * 100) / 100, severity, consideredCount };
}
