import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session || session.role !== "BANK") return jsonError(403, "Not authorized");

  const { id } = await ctx.params;
  const signal = await db.fraudSignal.findUnique({ where: { id }, include: { address: true } });
  if (!signal) return jsonError(404, "Signal not found");

  await logActivity({
    userId: session.userId,
    action: "FRAUD_SIGNAL_EXPORTED",
    description: signal.entityLabel,
  });

  const report = {
    id: signal.id,
    entityLabel: signal.entityLabel,
    signalType: signal.signalType,
    severity: signal.severity,
    source: signal.source,
    watchlistRef: signal.watchlistRef,
    flaggedAt: signal.flaggedAt,
    slaDeadline: signal.slaDeadline,
    resolvedAt: signal.resolvedAt,
    address: signal.address
      ? { label: signal.address.label, confidenceTier: signal.address.confidenceTier }
      : null,
    exportedAt: new Date().toISOString(),
    exportedBy: session.userId,
  };

  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="oqran-signal-${signal.id}.json"`,
    },
  });
});
