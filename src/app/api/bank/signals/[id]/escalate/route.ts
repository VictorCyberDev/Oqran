import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

export const POST = withErrorHandling(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session || session.role !== "BANK") return jsonError(403, "Not authorized");

  const { id } = await ctx.params;
  const signal = await db.fraudSignal.findUnique({ where: { id } });
  if (!signal) return jsonError(404, "Signal not found");

  const updated = await db.fraudSignal.update({
    where: { id },
    data: { resolvedAt: new Date(), resolvedById: session.userId },
  });

  await appendLedgerEntry({
    kind: "FRAUD_SIGNAL_ESCALATED",
    signalId: id,
    escalatedById: session.userId,
    entityLabel: signal.entityLabel,
  });

  await logActivity({
    userId: session.userId,
    action: "FRAUD_SIGNAL_ESCALATED",
    description: `Escalated to CBN report — ${signal.entityLabel}`,
  });

  return NextResponse.json({ ok: true, resolvedAt: updated.resolvedAt });
});
