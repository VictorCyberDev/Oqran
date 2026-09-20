import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const addSchema = z.object({
  addressId: z.string().min(1),
  label: z.string().min(1).max(40),
});

const removeSchema = z.object({ id: z.string().min(1) });

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  await enforceRateLimit(`saved-places:write:user:${session.userId}`, 40, 60 * 60 * 1000);

  const { addressId, label } = addSchema.parse(await req.json());

  const address = await db.address.findUnique({ where: { id: addressId } });
  if (!address) return jsonError(404, "Address not found");

  // Saving the same place twice just renames it, so the button is safe to
  // press again without producing duplicates.
  const saved = await db.savedPlace.upsert({
    where: { userId_addressId: { userId: session.userId, addressId } },
    create: {
      userId: session.userId,
      addressId,
      label: label.trim(),
      lastSeenSeverity: address.severity,
    },
    update: { label: label.trim() },
  });

  return NextResponse.json({ ok: true, savedPlace: { id: saved.id, label: saved.label } });
});

export const DELETE = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session) return jsonError(401, "Not signed in");

  const { id } = removeSchema.parse(await req.json());

  const existing = await db.savedPlace.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.userId) {
    return jsonError(404, "Saved place not found");
  }

  await db.savedPlace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
