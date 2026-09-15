import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { issueDeviceTrustToken } from "@/lib/auth/device-trust";
import { pinSchema } from "@/lib/validation";
import { userAgent } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";
import { jsonError } from "@/lib/http";

const bodySchema = z.object({ pin: pinSchema, label: z.string().min(1).max(60) });

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  const { pin, label } = bodySchema.parse(await req.json());

  await issueDeviceTrustToken({
    userId: session.userId,
    pin,
    label,
    userAgent: userAgent(req),
  });

  return NextResponse.json({ ok: true });
});
