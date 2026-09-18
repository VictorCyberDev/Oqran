import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema, otpCodeSchema, phoneSchema, selfServiceRoleSchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { clientIp, userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  role: selfServiceRoleSchema,
  // Collected for future features (not a verification channel) — optional.
  phone: phoneSchema.optional(),
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

  const user = await db.user.create({
    data: {
      role: body.role,
      authMethod: "EMAIL",
      email: body.email,
      phone: body.phone,
      status: "ACTIVE",
    },
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
