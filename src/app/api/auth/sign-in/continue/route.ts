import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/validation";
import { issueOtp } from "@/lib/auth/otp";
import { getTrustedDeviceForUser } from "@/lib/auth/device-trust";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ email: emailSchema });

export const POST = withErrorHandling(async (req) => {
  await enforceRateLimit(`sign-in:continue:ip:${clientIp(req) ?? "unknown"}`, 30, 10 * 60 * 1000);

  const { email } = bodySchema.parse(await req.json());

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ ok: false, error: "No account found for that email." });
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

  await issueOtp({ target: email, purpose: "SIGN_IN", userId: user.id });

  return NextResponse.json({ ok: true, mode: "otp" });
});
