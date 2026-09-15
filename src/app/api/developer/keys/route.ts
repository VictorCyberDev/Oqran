import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

const bodySchema = z.object({ name: z.string().min(2).max(60) });

function generateKey() {
  const secret = randomBytes(24).toString("hex");
  const full = `oqr_live_${secret}`;
  return { full, prefix: full.slice(0, 14) };
}

export const POST = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "DEVELOPER") return jsonError(403, "Not authorized");

  await enforceRateLimit(`developer:keys:create:${session.userId}`, 10, 60 * 60 * 1000);

  const { name } = bodySchema.parse(await req.json());
  const { full, prefix } = generateKey();
  const apiKeyHash = await bcrypt.hash(full, Number(process.env.AUTH_BCRYPT_ROUNDS ?? "12"));

  const client = await db.apiClient.create({
    data: {
      userId: session.userId,
      name,
      apiKeyHash,
      apiKeyPrefix: prefix,
      scopes: "read:addresses,read:risk",
    },
  });

  return NextResponse.json({ ok: true, id: client.id, key: full });
});
