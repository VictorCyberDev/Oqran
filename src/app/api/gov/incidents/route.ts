import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { daysAgo } from "@/lib/dates";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session || session.role !== "GOVERNMENT") return jsonError(403, "Not authorized");

  const incidents = await db.incident.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      createdAt: { gte: daysAgo(180) },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      type: true,
      severity: true,
      latitude: true,
      longitude: true,
      status: true,
      createdAt: true,
      address: { select: { label: true } },
    },
  });

  return NextResponse.json({ ok: true, incidents });
});
