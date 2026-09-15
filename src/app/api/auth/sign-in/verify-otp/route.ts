import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { credentialSchema, otpCodeSchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { clientIp, userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = credentialSchema.and(z.object({ code: otpCodeSchema }));

export const POST = withErrorHandling(async (req) => {
  const body = bodySchema.parse(await req.json());

  const result = await verifyOtp({
    target: body.target,
    targetType: body.targetType,
    purpose: "SIGN_IN",
    code: body.code,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason });
  }

  const user =
    body.targetType === "PHONE"
      ? await db.user.findUnique({ where: { phone: body.target } })
      : await db.user.findUnique({ where: { email: body.target } });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Account no longer exists." });
  }

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);

  await logActivity({
    userId: user.id,
    action: "SIGN_IN",
    description: `Signed in via ${body.targetType === "PHONE" ? "SMS" : "email"} code`,
    device: userAgent(req),
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true, role: user.role });
});
