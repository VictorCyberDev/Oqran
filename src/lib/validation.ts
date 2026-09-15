import { z } from "zod";

/** Normalizes common Nigerian phone formats to E.164 (+234XXXXXXXXXX). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+234\d{10}$/.test(digits)) return digits;
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  return null;
}

export const phoneSchema = z.string().transform((val, ctx) => {
  const normalized = normalizePhone(val);
  if (!normalized) {
    ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number" });
    return z.NEVER;
  }
  return normalized;
});

export const emailSchema = z.email().toLowerCase();

export const otpCodeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

export const pinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "PIN must be 4-6 digits");

export const targetTypeSchema = z.enum(["PHONE", "EMAIL"]);

export const credentialSchema = z.discriminatedUnion("targetType", [
  z.object({ targetType: z.literal("PHONE"), target: phoneSchema }),
  z.object({ targetType: z.literal("EMAIL"), target: emailSchema }),
]);

export const selfServiceRoleSchema = z.enum(["CITIZEN", "BUSINESS", "DEVELOPER"]);
export const orgRoleSchema = z.enum(["BANK", "GOVERNMENT"]);
