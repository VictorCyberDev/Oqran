import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema, otpCodeSchema, phoneSchema, selfServiceRoleSchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { freshInviteCode } from "@/lib/invite-code";
import { clientIp, userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const businessOrgSchema = z.union([
  z.object({ mode: z.literal("new"), orgName: z.string().min(2).max(80) }),
  z.object({ mode: z.literal("join"), inviteCode: z.string().min(1) }),
]);

const bodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  role: selfServiceRoleSchema,
  // Collected for future features (not a verification channel) — optional.
  phone: phoneSchema.optional(),
  // Only meaningful for role: "BUSINESS" — start a new org (becomes its
  // LEAD) or join an existing one via invite code (becomes a MEMBER).
  // Neither path involves platform-admin review: Business isn't a
  // restricted role the way Bank/Government are.
  businessOrg: businessOrgSchema.optional(),
});

export const POST = withErrorHandling(async (req) => {
  const body = bodySchema.parse(await req.json());

  const result = await verifyOtp({ target: body.email, purpose: "CREATE_ACCOUNT", code: body.code });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason });
  }

  if (body.phone) {
    const existingPhone = await db.user.findUnique({ where: { phone: body.phone } });
    if (existingPhone) {
      return NextResponse.json({
        ok: false,
        error: "That phone number is already on another account.",
      });
    }
  }

  let organizationId: string | undefined;
  let orgRole: "MEMBER" | "LEAD" = "MEMBER";

  if (body.role === "BUSINESS" && body.businessOrg?.mode === "join") {
    const org = await db.organization.findUnique({ where: { inviteCode: body.businessOrg.inviteCode } });
    if (!org || org.type !== "BUSINESS") {
      return NextResponse.json({ ok: false, error: "That invite code is not valid." });
    }
    organizationId = org.id;
    orgRole = "MEMBER";
  }

  const user = await db.$transaction(async (tx) => {
    if (body.role === "BUSINESS" && body.businessOrg?.mode === "new") {
      const org = await tx.organization.create({
        data: {
          name: body.businessOrg.orgName,
          type: "BUSINESS",
          inviteCode: freshInviteCode("OQ-BIZ"),
          verificationStatus: "VERIFIED",
        },
      });
      organizationId = org.id;
      orgRole = "LEAD";
    }

    return tx.user.create({
      data: {
        role: body.role,
        authMethod: "EMAIL",
        email: body.email,
        phone: body.phone,
        status: "ACTIVE",
        organizationId,
        orgRole,
      },
    });
  });

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);

  await logActivity({
    userId: user.id,
    action: "ACCOUNT_CREATED",
    description: `${body.role} account created`,
    device: userAgent(req),
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true, role: user.role });
});
