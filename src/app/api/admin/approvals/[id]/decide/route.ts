import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ decision: z.enum(["approve", "reject"]) });

export const POST = withErrorHandling(
  async (req, ctx: { params: Promise<{ id: string }> }) => {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") return jsonError(403, "Not authorized");

    const { id } = await ctx.params;
    const { decision } = bodySchema.parse(await req.json());

    const approval = await db.pendingApproval.findUnique({ where: { id } });
    if (!approval || approval.status !== "PENDING") {
      return jsonError(404, "Approval not found or already decided");
    }

    const status = decision === "approve" ? "APPROVED" : "REJECTED";

    await db.pendingApproval.update({
      where: { id },
      data: { status, reviewedById: session.userId, reviewedAt: new Date() },
    });

    if (decision === "approve") {
      await db.user.update({ where: { id: approval.userId }, data: { status: "ACTIVE" } });
    }

    await appendLedgerEntry({
      kind: "APPROVAL_DECIDED",
      approvalId: id,
      decision,
      decidedById: session.userId,
    });

    await logActivity({
      userId: session.userId,
      action: "APPROVAL_DECIDED",
      description: `${decision === "approve" ? "Approved" : "Rejected"} ${approval.referenceCode}`,
    });

    return NextResponse.json({ ok: true });
  }
);
