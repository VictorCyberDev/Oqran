import "server-only";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { OtpPurpose } from "@/generated/prisma/enums";
import { sendOtpEmail } from "@/lib/notify/email";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const MAX_ISSUE_PER_WINDOW = 3;
const ISSUE_WINDOW_MS = 10 * 60 * 1000; // 3 sends per 10 minutes per target
const RESEND_COOLDOWN_MS = 45 * 1000;

/** Fixed code accepted only for accounts seeded with isDemo: true — never
 * settable or reachable through any public path. Not surfaced anywhere in
 * the sign-in UI; a demo account behaves identically to a real one except
 * that this code always verifies and no email is actually sent. */
const DEMO_OTP_CODE = "000000";

function bcryptRounds() {
  return Number(process.env.AUTH_BCRYPT_ROUNDS ?? "12");
}

function generateCode(): string {
  // crypto.randomInt is a CSPRNG — Math.random() is not acceptable for OTPs.
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export class OtpError extends Error {}

/** Distinguishes "the email provider rejected/couldn't send this" from an
 * unexpected bug — surfaced as its own client-facing message and status
 * (see withErrorHandling) instead of a generic 500, and logged with the
 * real underlying cause server-side for whoever's operating the deployment. */
export class EmailDeliveryError extends Error {}

export async function issueOtp(params: {
  target: string;
  purpose: OtpPurpose;
  userId?: string;
}): Promise<void> {
  const { target, purpose, userId } = params;

  await enforceRateLimit(`otp:resend:${target}`, 1, RESEND_COOLDOWN_MS);
  await enforceRateLimit(`otp:issue:${target}:${purpose}`, MAX_ISSUE_PER_WINDOW, ISSUE_WINDOW_MS);

  const user = userId
    ? await db.user.findUnique({ where: { id: userId }, select: { isDemo: true } })
    : null;
  const isDemo = user?.isDemo ?? false;

  const code = isDemo ? DEMO_OTP_CODE : generateCode();

  // Send before persisting: if delivery fails, the user never sees this
  // code anyway, so don't burn their one-per-45s resend window or a slot
  // in the 3-per-10-minutes issue cap on a code they'll never receive.
  if (!isDemo) {
    try {
      await sendOtpEmail(target, code);
    } catch (err) {
      console.error("[otp] failed to send verification email:", err);
      throw new EmailDeliveryError(
        "We couldn't send your verification email right now. Please try again shortly."
      );
    }
  }

  const codeHash = await bcrypt.hash(code, bcryptRounds());

  await db.otpCode.create({
    data: {
      userId,
      target,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      maxAttempts: MAX_ATTEMPTS,
    },
  });
}

export async function verifyOtp(params: {
  target: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ ok: true; otpId: string } | { ok: false; reason: string }> {
  const { target, purpose, code } = params;

  await enforceRateLimit(`otp:verify:${target}`, 10, 10 * 60 * 1000);

  const candidate = await db.otpCode.findFirst({
    where: {
      target,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!candidate) {
    return { ok: false, reason: "No active code. Request a new one." };
  }
  if (candidate.attemptCount >= candidate.maxAttempts) {
    return { ok: false, reason: "Too many attempts. Request a new code." };
  }

  const matches = await bcrypt.compare(code, candidate.codeHash);

  if (!matches) {
    await db.otpCode.update({
      where: { id: candidate.id },
      data: { attemptCount: { increment: 1 } },
    });
    return { ok: false, reason: "Incorrect code." };
  }

  await db.otpCode.update({
    where: { id: candidate.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, otpId: candidate.id };
}
