import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

export const POST = withErrorHandling(
  async (_req, ctx: { params: Promise<{ id: string }> }) => {
    const session = await getSession();
    if (!session) return jsonError(401, "Not signed in");

    const { id } = await ctx.params;
    await db.apiClient.updateMany({
      where: { id, userId: session.userId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  }
);
