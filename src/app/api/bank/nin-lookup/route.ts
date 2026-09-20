import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";
import { simulateNinIdentity } from "@/lib/simulation";

const bodySchema = z.object({
  nin: z.string().regex(/^\d{11}$/, "NIN must be 11 digits"),
});

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "BANK") return jsonError(403, "Not authorized");

  await enforceRateLimit(`bank:nin-lookup:user:${session.userId}`, 60, 10 * 60 * 1000);

  const { nin } = bodySchema.parse(await req.json());
  const identity = simulateNinIdentity(nin);

  // Logged by pseudonymous reference, never the NIN itself.
  await logActivity({
    userId: session.userId,
    action: "NIN_CROSS_REFERENCE",
    description: `${identity.holderRef} — ${identity.status}`,
  });

  return NextResponse.json({ ok: true, identity });
});
