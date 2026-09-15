import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentialSchema, selfServiceRoleSchema } from "@/lib/validation";
import { issueOtp } from "@/lib/auth/otp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

export const POST = withErrorHandling(async (req) => {
  await enforceRateLimit(
    `create-account:continue:ip:${clientIp(req) ?? "unknown"}`,
    20,
    10 * 60 * 1000
  );

  const json = await req.json();
  const role = selfServiceRoleSchema.parse(json.role);
  const body = credentialSchema.parse(json);

  const existing =
    body.targetType === "PHONE"
      ? await db.user.findUnique({ where: { phone: body.target } })
      : await db.user.findUnique({ where: { email: body.target } });

  if (existing) {
    return NextResponse.json({
      ok: false,
      error: "An account already exists for that credential. Try signing in instead.",
    });
  }

  await issueOtp({ target: body.target, targetType: body.targetType, purpose: "CREATE_ACCOUNT" });

  return NextResponse.json({ ok: true, role });
});
