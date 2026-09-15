import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { credentialSchema, otpCodeSchema, selfServiceRoleSchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { clientIp, userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = credentialSchema.and(
  z.object({ code: otpCodeSchema, role: selfServiceRoleSchema })
);

export const POST = withErrorHandling(async (req) => {
  const body = bodySchema.parse(await req.json());

  const result = await verifyOtp({
    target: body.target,
    targetType: body.targetType,
    purpose: "CREATE_ACCOUNT",
    code: body.code,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason });
  }

  const user = await db.user.create({
    data: {
      role: body.role,
      authMethod: body.targetType === "PHONE" ? "SMS" : "EMAIL",
      phone: body.targetType === "PHONE" ? body.target : undefined,
      email: body.targetType === "EMAIL" ? body.target : undefined,
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
