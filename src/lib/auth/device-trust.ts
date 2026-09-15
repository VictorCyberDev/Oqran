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
  label: string;
  userAgent?: string;
  approxLocation?: string;
}): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const deviceTokenHash = await bcrypt.hash(token, bcryptRounds());

  await db.trustedDevice.create({
    data: {
      userId: params.userId,
      deviceTokenHash,
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
