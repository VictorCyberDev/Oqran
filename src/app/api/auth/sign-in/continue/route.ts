import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialSchema } from "@/lib/validation";
import { issueOtp } from "@/lib/auth/otp";
import { getTrustedDeviceForUser } from "@/lib/auth/device-trust";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

export const POST = withErrorHandling(async (req) => {
  await enforceRateLimit(`sign-in:continue:ip:${clientIp(req) ?? "unknown"}`, 30, 10 * 60 * 1000);

  const body = credentialSchema.parse(await req.json());

  const user =
    body.targetType === "PHONE"
      ? await db.user.findUnique({ where: { phone: body.target } })
      : await db.user.findUnique({ where: { email: body.target } });

  if (!user) {
    return NextResponse.json({ ok: false, error: "No account found for that credential." });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({
      ok: false,
      error: "Your account is pending approval. We'll notify you once it's reviewed.",
    });
  }

  const trustedDevice = await getTrustedDeviceForUser(user.id);
  if (trustedDevice) {
    return NextResponse.json({ ok: true, mode: "unlock", deviceId: trustedDevice.id });
  }

  await issueOtp({
    target: body.target,
    targetType: body.targetType,
    purpose: "SIGN_IN",
    userId: user.id,
  });

  return NextResponse.json({ ok: true, mode: "otp" });
});
