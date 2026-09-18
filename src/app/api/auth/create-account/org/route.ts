import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema, orgRoleSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({
  role: orgRoleSchema,
  method: z.enum(["invite", "email"]),
  email: emailSchema,
  inviteCode: z.string().min(1).optional(),
  idNumber: z.string().regex(/^\d{10,11}$/, "Enter a valid 10-11 digit ID number"),
  isLeadRequest: z.boolean().optional(),
});

function referenceCode() {
  return `OQ-ORG-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const POST = withErrorHandling(async (req) => {
  await enforceRateLimit(`create-account:org:ip:${clientIp(req) ?? "unknown"}`, 10, 60 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({
      ok: false,
      error: "An account already exists for that email.",
    });
  }

  let organizationId: string | undefined;

  if (body.method === "invite") {
    if (!body.inviteCode) {
      return NextResponse.json({ ok: false, error: "Enter your organizational invite code." });
    }
    const org = await db.organization.findUnique({ where: { inviteCode: body.inviteCode } });
    if (!org || org.type !== body.role) {
      return NextResponse.json({ ok: false, error: "That invite code is not valid." });
    }
    organizationId = org.id;
  }

  const user = await db.user.create({
    data: {
      role: body.role,
      email: body.email,
      authMethod: "EMAIL",
      nin: body.role === "GOVERNMENT" ? body.idNumber : undefined,
      status: "PENDING_APPROVAL",
      organizationId,
    },
  });

  const approval = await db.pendingApproval.create({
    data: {
      userId: user.id,
      organizationId,
      requestedRole: body.role,
      isLeadRequest: body.isLeadRequest ?? false,
      referenceCode: referenceCode(),
    },
  });

  return NextResponse.json({ ok: true, referenceCode: approval.referenceCode });
});
