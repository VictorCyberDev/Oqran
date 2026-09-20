import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";
import { simulateNinIdentity } from "@/lib/simulation";
import type { RiskSeverity } from "@/generated/prisma/enums";

/**
 * A bank escalating to Government. This is the cross-institution handoff
 * OQRAN exists for, so it writes a real Case row a Government
 * investigator can open, annotate and resolve — deliberately not a
 * notification that disappears.
 */
const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("signal"), signalId: z.string().min(1), note: z.string().max(2000).optional() }),
  z.object({ kind: z.literal("address"), addressId: z.string().min(1), note: z.string().max(2000).optional() }),
  z.object({
    kind: z.literal("nin"),
    nin: z.string().regex(/^\d{11}$/, "NIN must be 11 digits"),
    note: z.string().max(2000).optional(),
  }),
]);

function referenceCode() {
  return `OQ-CASE-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "BANK") return jsonError(403, "Not authorized");

  await enforceRateLimit(`bank:escalate:user:${session.userId}`, 30, 60 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  const viewer = await db.user.findUnique({
    where: { id: session.userId },
    include: { organization: { select: { name: true } } },
  });
  const originLabel = viewer?.organization?.name ?? "Bank compliance";

  let title: string;
  let severity: RiskSeverity = "ELEVATED";
  let addressId: string | undefined;
  let fraudSignalId: string | undefined;
  let context: string | undefined;

  if (body.kind === "signal") {
    const signal = await db.fraudSignal.findUnique({ where: { id: body.signalId } });
    if (!signal) return jsonError(404, "Signal not found");
    title = signal.entityLabel;
    severity = signal.severity;
    addressId = signal.addressId ?? undefined;
    fraudSignalId = signal.id;
    context = `Fraud signal: ${signal.signalType}${signal.watchlistRef ? ` · watchlist ${signal.watchlistRef}` : ""}`;
  } else if (body.kind === "address") {
    const address = await db.address.findUnique({ where: { id: body.addressId } });
    if (!address) return jsonError(404, "Address not found");
    title = address.label;
    severity = address.severity;
    addressId = address.id;
    context = `Address flagged by ${originLabel} · confidence tier ${address.confidenceTier.replace(/_/g, " ")}`;
  } else {
    // Store the pseudonymous reference rather than the NIN itself — a case
    // is visible to another institution, and the raw number adds nothing
    // an investigator can act on that the reference doesn't.
    const identity = simulateNinIdentity(body.nin);
    title = `Identity check — ${identity.holderRef}`;
    severity = identity.status === "WATCHLIST" ? "CRITICAL" : "ELEVATED";
    context =
      identity.status === "WATCHLIST"
        ? `NIN cross-reference returned a regulatory watchlist hit (${identity.watchlistRef}). Simulated — pending NIMC API access.`
        : `NIN cross-reference returned ${identity.status === "MATCHED" ? "a match" : "no match"}. Simulated — pending NIMC API access.`;
  }

  const summary = [context, body.note?.trim()].filter(Boolean).join("\n\n");

  const created = await db.case.create({
    data: {
      referenceCode: referenceCode(),
      title,
      source: "BANK_ESCALATION",
      status: "OPEN",
      severity,
      summary: summary || null,
      originLabel,
      addressId,
      fraudSignalId,
      raisedById: session.userId,
    },
  });

  await appendLedgerEntry({
    kind: "CASE_RAISED",
    caseId: created.id,
    referenceCode: created.referenceCode,
    source: "BANK_ESCALATION",
    raisedById: session.userId,
    severity: created.severity,
  });

  await logActivity({
    userId: session.userId,
    action: "ESCALATED_TO_GOVERNMENT",
    description: `${created.title} — ${created.referenceCode}`,
  });

  return NextResponse.json({
    ok: true,
    case: { id: created.id, referenceCode: created.referenceCode, title: created.title },
  });
});
