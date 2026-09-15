import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { haversineDistanceKm } from "@/lib/geo/risk-score";
import { clientIp, userAgent, jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";
import type { RiskSeverity } from "@/generated/prisma/enums";

const CATEGORY_SEVERITY: Record<string, RiskSeverity> = {
  fraud: "ELEVATED",
  theft: "ELEVATED",
  cyber: "ELEVATED",
  addr: "GUARDED",
  pos: "GUARDED",
  other: "LOW",
};

const CATEGORY_LABEL: Record<string, string> = {
  fraud: "Fraud",
  theft: "Theft or Robbery",
  cyber: "Cybercrime",
  addr: "Suspicious Address",
  pos: "PoS / Agent Issue",
  other: "Other",
};

const bodySchema = z.object({
  category: z.enum(["fraud", "theft", "cyber", "addr", "pos", "other"]),
  description: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

function referenceCode() {
  return `OQ-${Math.floor(1000 + Math.random() * 9000)}-NG`;
}

const NEAREST_ADDRESS_RADIUS_KM = 0.3;

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  await enforceRateLimit(`incidents:create:user:${session.userId}`, 5, 60 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  let addressId: string | undefined;
  if (body.latitude !== undefined && body.longitude !== undefined) {
    const candidates = await db.address.findMany({
      where: {
        latitude: { gte: body.latitude - 0.01, lte: body.latitude + 0.01 },
        longitude: { gte: body.longitude - 0.01, lte: body.longitude + 0.01 },
      },
    });
    const nearest = candidates
      .map((a) => ({
        a,
        d: haversineDistanceKm(body.latitude!, body.longitude!, a.latitude, a.longitude),
      }))
      .sort((x, y) => x.d - y.d)[0];
    if (nearest && nearest.d <= NEAREST_ADDRESS_RADIUS_KM) addressId = nearest.a.id;
  }

  const incident = await db.incident.create({
    data: {
      type: CATEGORY_LABEL[body.category],
      severity: CATEGORY_SEVERITY[body.category],
      description: body.description,
      addressId,
      latitude: body.latitude,
      longitude: body.longitude,
      reporterId: session.userId,
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
    action: "INCIDENT_REPORTED",
    description: `${incident.type} — ${incident.referenceCode}`,
    device: userAgent(req),
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true, referenceCode: incident.referenceCode });
});
