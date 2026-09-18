import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailSchema, selfServiceRoleSchema } from "@/lib/validation";
import { issueOtp } from "@/lib/auth/otp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ email: emailSchema, role: selfServiceRoleSchema });

export const POST = withErrorHandling(async (req) => {
  await enforceRateLimit(
    `create-account:continue:ip:${clientIp(req) ?? "unknown"}`,
    20,
    10 * 60 * 1000
  );

  const { email, role } = bodySchema.parse(await req.json());

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json({
      ok: false,
      error: "An account already exists for that email. Try signing in instead.",
    });
  }

  await issueOtp({ target: email, purpose: "CREATE_ACCOUNT" });

  return NextResponse.json({ ok: true, role });
});
