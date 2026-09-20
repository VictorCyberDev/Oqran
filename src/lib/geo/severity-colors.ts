import type { RiskSeverity } from "@/generated/prisma/enums";

/** CSS custom-property references, not hardcoded hex — resolves through
 * the design-token system so marker colors track the active theme. */
export const RISK_SEVERITY_HEX: Record<RiskSeverity, string> = {
  LOW: "var(--color-risk-low)",
  GUARDED: "var(--color-risk-guarded)",
  ELEVATED: "var(--color-risk-elevated)",
  CRITICAL: "var(--color-risk-critical)",
};

/** Incident.type value an investigator's "Flag as dangerous for civilians"
 * action writes — reused (not a new column) so this stays visually
 * distinguishable from ordinary incident markers on the map without a
 * schema change. Matched by exact string in both the API route that
 * creates it and the map component that renders it differently. */
export const DANGER_FLAG_TYPE = "Danger Zone — Investigator Flagged";
