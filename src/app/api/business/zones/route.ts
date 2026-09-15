import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  type: z.string().min(2).max(60),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "BUSINESS") return jsonError(403, "Not authorized");

  await enforceRateLimit(`zones:create:user:${session.userId}`, 20, 60 * 60 * 1000);

  const body = bodySchema.parse(await req.json());
  const zone = await db.zone.create({ data: { ...body, businessId: session.userId } });

  return NextResponse.json({ ok: true, id: zone.id });
});
