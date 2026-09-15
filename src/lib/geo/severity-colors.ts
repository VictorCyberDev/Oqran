import type { RiskSeverity } from "@/generated/prisma/enums";

/** CSS custom-property references, not hardcoded hex — resolves through
 * the design-token system so marker colors track the active theme. */
export const RISK_SEVERITY_HEX: Record<RiskSeverity, string> = {
  LOW: "var(--color-risk-low)",
  GUARDED: "var(--color-risk-guarded)",
  ELEVATED: "var(--color-risk-elevated)",
  CRITICAL: "var(--color-risk-critical)",
};
