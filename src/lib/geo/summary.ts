import type { RiskSeverity } from "@/generated/prisma/enums";

/**
 * Plain-language readouts of the risk model, for people who are deciding
 * whether to go somewhere rather than reading a dashboard. Pure functions
 * with no I/O, so they're unit-tested independently of the queries that
 * feed them.
 */

const BAND_HEADLINE: Record<RiskSeverity, string> = {
  LOW: "Generally calm",
  GUARDED: "Some caution advised",
  ELEVATED: "Heightened risk",
  CRITICAL: "Serious risk",
};

const BAND_ADVICE: Record<RiskSeverity, string> = {
  LOW: "Nothing recent stands out here.",
  GUARDED: "Worth staying aware of your surroundings.",
  ELEVATED: "Avoid arriving after dark alone, and agree meeting points in public.",
  CRITICAL: "Treat this area as unsafe for meetings or deliveries right now.",
};

export function riskBandHeadline(severity: RiskSeverity): string {
  return BAND_HEADLINE[severity];
}

export function riskBandAdvice(severity: RiskSeverity): string {
  return BAND_ADVICE[severity];
}

export interface SummarisableIncident {
  type: string;
  ageDays: number;
}

/**
 * "3 incidents reported here in the past 30 days, mostly theft-related."
 * Falls back to a count-only sentence when no single type dominates, so
 * the summary never overstates a pattern that isn't there.
 */
export function summariseIncidents(
  incidents: SummarisableIncident[],
  windowDays = 30
): string {
  const recent = incidents.filter((i) => i.ageDays <= windowDays);

  if (recent.length === 0) {
    return `No incidents reported here in the past ${windowDays} days.`;
  }

  const counts = new Map<string, number>();
  for (const incident of recent) {
    counts.set(incident.type, (counts.get(incident.type) ?? 0) + 1);
  }

  const noun = recent.length === 1 ? "incident" : "incidents";
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topType, topCount] = sorted[0];

  // Only call out a dominant type when it's actually dominant — at least
  // half of what was reported, and not a tie with the runner-up.
  const dominant = topCount * 2 >= recent.length && (sorted[1]?.[1] ?? 0) < topCount;

  if (!dominant) {
    return `${recent.length} ${noun} reported here in the past ${windowDays} days.`;
  }

  return `${recent.length} ${noun} reported here in the past ${windowDays} days, mostly ${topType.toLowerCase()}-related.`;
}
