import "server-only";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { OtpPurpose, OtpTarget } from "@/generated/prisma/enums";
import { sendOtpEmail } from "@/lib/notify/email";
import { sendOtpSms } from "@/lib/notify/sms";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const MAX_ISSUE_PER_WINDOW = 3;
const ISSUE_WINDOW_MS = 10 * 60 * 1000; // 3 sends per 10 minutes per target
const RESEND_COOLDOWN_MS = 45 * 1000;

function bcryptRounds() {
  return Number(process.env.AUTH_BCRYPT_ROUNDS ?? "12");
}

function generateCode(): string {
  // crypto.randomInt is a CSPRNG — Math.random() is not acceptable for OTPs.
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export class OtpError extends Error {}

export async function issueOtp(params: {
  target: string;
  targetType: OtpTarget;
  purpose: OtpPurpose;
  userId?: string;
}): Promise<void> {
  const { target, targetType, purpose, userId } = params;

  await enforceRateLimit(`otp:resend:${targetType}:${target}`, 1, RESEND_COOLDOWN_MS);
  await enforceRateLimit(
    `otp:issue:${targetType}:${target}:${purpose}`,
    MAX_ISSUE_PER_WINDOW,
    ISSUE_WINDOW_MS
  );

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, bcryptRounds());

  await db.otpCode.create({
    data: {
      userId,
      target,
      targetType,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      maxAttempts: MAX_ATTEMPTS,
    },
  });

  if (targetType === "EMAIL") {
    await sendOtpEmail(target, code);
  } else {
    await sendOtpSms(target, code);
  }
}

export async function verifyOtp(params: {
  target: string;
  targetType: OtpTarget;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ ok: true; otpId: string } | { ok: false; reason: string }> {
  const { target, targetType, purpose, code } = params;

  await enforceRateLimit(`otp:verify:${targetType}:${target}`, 10, 10 * 60 * 1000);

  const candidate = await db.otpCode.findFirst({
    where: {
      target,
      targetType,
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
