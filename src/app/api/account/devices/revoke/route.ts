import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { revokeDeviceTrust } from "@/lib/auth/device-trust";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ deviceId: z.string().min(1) });

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  const { deviceId } = bodySchema.parse(await req.json());
  await revokeDeviceTrust(deviceId, session.userId);

  return NextResponse.json({ ok: true });
});
