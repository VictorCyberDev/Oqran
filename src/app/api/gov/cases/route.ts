import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";
import { DANGER_FLAG_TYPE } from "@/lib/geo/severity-colors";

/** Opens an existing incident as a case an investigator can work. */
const bodySchema = z.object({ incidentId: z.string().min(1) });

function referenceCode() {
  return `OQ-CASE-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "GOVERNMENT") return jsonError(403, "Not authorized");

  await enforceRateLimit(`gov:cases:create:user:${session.userId}`, 40, 60 * 60 * 1000);

  const { incidentId } = bodySchema.parse(await req.json());

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    include: { address: true, reporter: { select: { role: true } } },
  });
  if (!incident) return jsonError(404, "Incident not found");

  const existing = await db.case.findFirst({ where: { incidentId } });
  if (existing) {
    return NextResponse.json({
      ok: true,
      case: { id: existing.id, referenceCode: existing.referenceCode },
      alreadyOpen: true,
    });
  }

  // Source is derived from the incident itself rather than trusted from the
  // client, so a case's provenance can't be mislabelled from the outside.
  const isInvestigatorFlag = incident.type === DANGER_FLAG_TYPE;

  const created = await db.case.create({
    data: {
      referenceCode: referenceCode(),
      title: incident.address?.label ?? incident.type,
      source: isInvestigatorFlag ? "INVESTIGATOR_FLAG" : "CITIZEN_REPORT",
      status: "OPEN",
      severity: incident.severity,
      summary: incident.description ?? `${incident.type} · reference ${incident.referenceCode}`,
      originLabel: isInvestigatorFlag ? "Government investigator" : "Citizen report",
      addressId: incident.addressId ?? undefined,
      incidentId: incident.id,
      raisedById: session.userId,
    },
  });

  await appendLedgerEntry({
    kind: "CASE_RAISED",
    caseId: created.id,
    referenceCode: created.referenceCode,
    source: created.source,
    raisedById: session.userId,
    severity: created.severity,
  });

  await logActivity({
    userId: session.userId,
    action: "CASE_OPENED",
    description: `${created.title} — ${created.referenceCode}`,
  });

  return NextResponse.json({
    ok: true,
    case: { id: created.id, referenceCode: created.referenceCode },
  });
});
