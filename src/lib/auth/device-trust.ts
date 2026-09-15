import "server-only";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const DEVICE_COOKIE = "oqran-device";
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function bcryptRounds() {
  return Number(process.env.AUTH_BCRYPT_ROUNDS ?? "12");
}

export async function issueDeviceTrustToken(params: {
  userId: string;
  pin: string;
  label: string;
  userAgent?: string;
  approxLocation?: string;
}): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const rounds = bcryptRounds();
  const [deviceTokenHash, pinHash] = await Promise.all([
    bcrypt.hash(token, rounds),
    bcrypt.hash(params.pin, rounds),
  ]);

  await db.trustedDevice.create({
    data: {
      userId: params.userId,
      deviceTokenHash,
      pinHash,
      label: params.label,
      userAgent: params.userAgent,
      approxLocation: params.approxLocation,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_TTL_SECONDS,
  });
}

/** Verifies the local unlock PIN for a trusted device (the second factor
 * that lets a recognized device skip OTP without skipping local proof of
 * presence — a platform biometric prompt can gate PIN entry client-side,
 * but the server only ever sees the PIN). */
export async function verifyDevicePin(deviceId: string, pin: string): Promise<boolean> {
  const device = await db.trustedDevice.findUnique({ where: { id: deviceId } });
  if (!device || device.revokedAt) return false;
  return bcrypt.compare(pin, device.pinHash);
}

/** Returns the trusted-device row for the current browser + user, if any and not revoked. */
export async function getTrustedDeviceForUser(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  if (!token) return null;

  const candidates = await db.trustedDevice.findMany({
    where: { userId, revokedAt: null },
  });

  for (const candidate of candidates) {
    if (await bcrypt.compare(token, candidate.deviceTokenHash)) {
      return candidate;
    }
  }
  return null;
}

export async function touchDeviceTrust(deviceId: string) {
  await db.trustedDevice.update({
    where: { id: deviceId },
    data: { lastUsedAt: new Date() },
  });
}

/** Revokes a device — scoped to the owning user so one account can't revoke another's. */
export async function revokeDeviceTrust(deviceId: string, userId: string) {
  await db.trustedDevice.updateMany({
    where: { id: deviceId, userId },
    data: { revokedAt: new Date() },
  });
}

export async function clearDeviceCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_COOKIE);
}
