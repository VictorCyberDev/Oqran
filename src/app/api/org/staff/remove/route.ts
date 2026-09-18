import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrgLead } from "@/lib/auth/org-guard";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ userId: z.string().min(1) });

export const POST = withErrorHandling(async (req) => {
  const lead = await getOrgLead(["BANK", "GOVERNMENT", "BUSINESS"]);
  if (!lead) return jsonError(403, "Not authorized");

  await enforceRateLimit(`org:staff:remove:${lead.organizationId}`, 20, 60 * 60 * 1000);

  const { userId } = bodySchema.parse(await req.json());

  if (userId === lead.id) {
    return jsonError(400, "You can't remove yourself.");
  }

  // Ownership check mirrors revokeDeviceTrust: the update only matches a
  // row that is both the target user AND already in this lead's own org.
  const result = await db.user.updateMany({
    where: { id: userId, organizationId: lead.organizationId },
    data: { status: "SUSPENDED" },
  });

  if (result.count === 0) {
    return jsonError(404, "That person isn't in your organization.");
  }

  await appendLedgerEntry({
    kind: "ORG_STAFF_REMOVED",
    organizationId: lead.organizationId,
    removedUserId: userId,
    removedById: lead.id,
  });

  await logActivity({
    userId: lead.id,
    action: "ORG_STAFF_REMOVED",
    description: userId,
  });

  return NextResponse.json({ ok: true });
});
