import type { CaseSource, CaseStatus } from "@/generated/prisma/enums";
import type { BadgeTone } from "@/components/ui/Badge";

/** A case's provenance is the point — an investigator needs to know at a
 * glance whether this came from a bank, a citizen, or their own team. */
export const CASE_SOURCE_LABEL: Record<CaseSource, string> = {
  CITIZEN_REPORT: "Citizen report",
  BANK_ESCALATION: "Bank escalation",
  INVESTIGATOR_FLAG: "Investigator-flagged",
};

export const CASE_SOURCE_TONE: Record<CaseSource, BadgeTone> = {
  CITIZEN_REPORT: "neutral",
  BANK_ESCALATION: "brand",
  INVESTIGATOR_FLAG: "watchlist",
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: "Open",
  UNDER_INVESTIGATION: "Under investigation",
  RESOLVED: "Resolved",
};

export const CASE_STATUS_TONE: Record<CaseStatus, BadgeTone> = {
  OPEN: "elevated",
  UNDER_INVESTIGATION: "guarded",
  RESOLVED: "low",
};

export const CASE_STATUSES: CaseStatus[] = ["OPEN", "UNDER_INVESTIGATION", "RESOLVED"];
