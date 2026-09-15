export type Trend = "Improving" | "Stable" | "Worsening";

/** Compares incident counts between two equal-length consecutive windows. */
export function computeTrend(recentCount: number, priorCount: number): Trend {
  if (recentCount < priorCount) return "Improving";
  if (recentCount > priorCount) return "Worsening";
  return "Stable";
}
