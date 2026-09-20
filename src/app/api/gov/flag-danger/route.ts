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

const bodySchema = z.object({ addressId: z.string().min(1) });

function referenceCode() {
  return `OQ-${Math.floor(1000 + Math.random() * 9000)}-NG`;
}

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "GOVERNMENT") return jsonError(403, "Not authorized");

  await enforceRateLimit(`gov:flag-danger:user:${session.userId}`, 20, 60 * 60 * 1000);

  const { addressId } = bodySchema.parse(await req.json());

  const address = await db.address.findUnique({ where: { id: addressId } });
  if (!address) return jsonError(404, "Address not found");

  const incident = await db.incident.create({
    data: {
      type: DANGER_FLAG_TYPE,
      severity: "CRITICAL",
      description: "Flagged by a government investigator as an active danger to civilians.",
      addressId: address.id,
      latitude: address.latitude,
      longitude: address.longitude,
      reporterId: session.userId,
      status: "UNDER_REVIEW",
      referenceCode: referenceCode(),
    },
  });

  await appendLedgerEntry({
    kind: "INCIDENT_REPORTED",
    incidentId: incident.id,
    referenceCode: incident.referenceCode,
    reporterId: session.userId,
    severity: incident.severity,
  });

  await logActivity({
    userId: session.userId,
    action: "DANGER_ZONE_FLAGGED",
    description: `${address.label} — ${incident.referenceCode}`,
  });

  return NextResponse.json({
    ok: true,
    incident: {
      id: incident.id,
      type: incident.type,
      severity: incident.severity,
      latitude: incident.latitude,
      longitude: incident.longitude,
      status: incident.status,
      createdAt: incident.createdAt.toISOString(),
      address: { label: address.label },
    },
  });
});
