import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z
  .object({
    status: z.enum(["OPEN", "UNDER_INVESTIGATION", "RESOLVED"]).optional(),
    note: z.string().min(1).max(2000).optional(),
  })
  .refine((b) => b.status || b.note, { message: "Provide a status change or a note" });

export const PATCH = withErrorHandling(
  async (req, ctx: { params: Promise<{ id: string }> }) => {
    const session = await getSession();
    if (!session || session.role !== "GOVERNMENT") return jsonError(403, "Not authorized");

    await enforceRateLimit(`gov:cases:update:user:${session.userId}`, 120, 60 * 60 * 1000);

    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());

    const existing = await db.case.findUnique({ where: { id } });
    if (!existing) return jsonError(404, "Case not found");

    if (body.note) {
      await db.caseNote.create({
        data: { caseId: id, authorId: session.userId, body: body.note.trim() },
      });
    }

    const updated = body.status
      ? await db.case.update({ where: { id }, data: { status: body.status } })
      : existing;

    if (body.status && body.status !== existing.status) {
      // Status transitions are the part an auditor cares about, so they go
      // in the hash-chained ledger rather than only the activity log.
      await appendLedgerEntry({
        kind: "CASE_STATUS_CHANGED",
        caseId: id,
        referenceCode: existing.referenceCode,
        from: existing.status,
        to: body.status,
        changedById: session.userId,
      });
    }

    await logActivity({
      userId: session.userId,
      action: body.status ? "CASE_STATUS_CHANGED" : "CASE_NOTE_ADDED",
      description: `${existing.referenceCode}${body.status ? ` → ${body.status.replace(/_/g, " ")}` : ""}`,
    });

    return NextResponse.json({ ok: true, status: updated.status });
  }
);
