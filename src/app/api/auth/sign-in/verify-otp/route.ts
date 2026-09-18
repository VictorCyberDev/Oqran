import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema, otpCodeSchema } from "@/lib/validation";
import { verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { clientIp, userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ email: emailSchema, code: otpCodeSchema });

export const POST = withErrorHandling(async (req) => {
  const { email, code } = bodySchema.parse(await req.json());

  const result = await verifyOtp({ target: email, purpose: "SIGN_IN", code });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason });
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Account no longer exists." });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({
      ok: false,
      error: "Your account is pending approval and cannot sign in yet.",
    });
  }

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);

  await logActivity({
    userId: user.id,
    action: "SIGN_IN",
    description: "Signed in via email code",
    device: userAgent(req),
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true, role: user.role });
});
