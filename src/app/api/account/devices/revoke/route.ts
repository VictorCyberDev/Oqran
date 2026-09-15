import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { revokeDeviceTrust } from "@/lib/auth/device-trust";
import { jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ deviceId: z.string().min(1) });

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  await enforceRateLimit(`devices:revoke:user:${session.userId}`, 20, 10 * 60 * 1000);

  const { deviceId } = bodySchema.parse(await req.json());
  await revokeDeviceTrust(deviceId, session.userId);

  return NextResponse.json({ ok: true });
});
