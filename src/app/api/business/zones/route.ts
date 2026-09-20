import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolvePlace } from "@/lib/geo/resolve-place";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

/**
 * A zone can be pinned by typing an address or by using the device's
 * location. Address is the path that actually works on a desktop with
 * location blocked, which is most of the time — requiring geolocation
 * made this form impossible to complete for those users.
 */
const bodySchema = z
  .object({
    name: z.string().min(2).max(80),
    type: z.string().min(2).max(60),
    address: z.string().min(3).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().min(0.2).max(50).optional(),
  })
  .refine((b) => b.address || (b.latitude !== undefined && b.longitude !== undefined), {
    message: "Give the zone an address, or use your current location",
  });

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "BUSINESS") return jsonError(403, "Not authorized");

  await enforceRateLimit(`zones:create:user:${session.userId}`, 20, 60 * 60 * 1000);

  const body = bodySchema.parse(await req.json());

  let latitude = body.latitude;
  let longitude = body.longitude;

  if ((latitude === undefined || longitude === undefined) && body.address) {
    const resolved = await resolvePlace(body.address);
    if (!resolved) {
      return NextResponse.json({
        ok: false,
        error: "Couldn't locate that address. Try a fuller address, or use your location.",
      });
    }
    latitude = resolved.latitude;
    longitude = resolved.longitude;
  }

  if (latitude === undefined || longitude === undefined) {
    return jsonError(400, "Could not determine a location for this zone");
  }

  const zone = await db.zone.create({
    data: {
      name: body.name,
      type: body.type,
      latitude,
      longitude,
      radiusKm: body.radiusKm ?? 2,
      businessId: session.userId,
    },
  });

  return NextResponse.json({ ok: true, id: zone.id });
});
