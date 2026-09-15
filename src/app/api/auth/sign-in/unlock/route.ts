import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pinSchema } from "@/lib/validation";
import { verifyDevicePin, touchDeviceTrust } from "@/lib/auth/device-trust";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp, userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ deviceId: z.string().min(1), pin: pinSchema });

export const POST = withErrorHandling(async (req) => {
  const { deviceId, pin } = bodySchema.parse(await req.json());

  await enforceRateLimit(`unlock:device:${deviceId}`, 8, 10 * 60 * 1000);

  const ok = await verifyDevicePin(deviceId, pin);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Incorrect PIN." });
  }

  const device = await db.trustedDevice.findUnique({ where: { id: deviceId } });
  if (!device || device.revokedAt) {
    return NextResponse.json({ ok: false, error: "This device is no longer trusted." });
  }

  const user = await db.user.findUnique({ where: { id: device.userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Account no longer exists." });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({
      ok: false,
      error: "Your account is pending approval and cannot sign in yet.",
    });
  }

  await touchDeviceTrust(device.id);

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);

  await logActivity({
    userId: user.id,
    action: "SIGN_IN",
    description: `Signed in on trusted device (${device.label})`,
    device: userAgent(req),
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true, role: user.role });
});
