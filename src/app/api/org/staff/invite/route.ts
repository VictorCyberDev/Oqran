import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/validation";
import { getOrgLead } from "@/lib/auth/org-guard";
import { appendLedgerEntry } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ email: emailSchema });

function referenceCode() {
  return `OQ-STAFF-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * A lead adding a seat to their own already-verified organization — not a
 * new org verification, so this never touches the platform-admin queue.
 * The PendingApproval row is still created, pre-resolved (APPROVED), so
 * every org member has the same audit trail regardless of how they joined.
 */
export const POST = withErrorHandling(async (req) => {
  const lead = await getOrgLead(["BANK", "GOVERNMENT", "BUSINESS"]);
  if (!lead) return jsonError(403, "Not authorized");

  await enforceRateLimit(`org:staff:invite:${lead.organizationId}`, 20, 60 * 60 * 1000);

  const { email } = bodySchema.parse(await req.json());

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "An account already exists for that email." });
  }

  const member = await db.user.create({
    data: {
      role: lead.role,
      email,
      authMethod: "EMAIL",
      status: "ACTIVE",
      organizationId: lead.organizationId,
      orgRole: "MEMBER",
    },
  });

  const approval = await db.pendingApproval.create({
    data: {
      userId: member.id,
      organizationId: lead.organizationId,
      requestedRole: lead.role,
      referenceCode: referenceCode(),
      status: "APPROVED",
      reviewedById: lead.id,
      reviewedAt: new Date(),
    },
  });

  await appendLedgerEntry({
    kind: "ORG_STAFF_INVITED",
    organizationId: lead.organizationId,
    invitedUserId: member.id,
    invitedById: lead.id,
    approvalId: approval.id,
  });

  await logActivity({
    userId: lead.id,
    action: "ORG_STAFF_INVITED",
    description: email,
  });

  return NextResponse.json({ ok: true });
});
