import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { verifyStoredChain } from "@/lib/ledger";
import { logActivity } from "@/lib/activity";
import { jsonError } from "@/lib/http";
import { withErrorHandling } from "@/lib/api-handler";

/** Wraps every field so embedded commas, quotes and newlines in a JSON
 * payload can't break the row structure. */
function csvCell(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${(text ?? "").replace(/"/g, '""')}"`;
}

/**
 * Full audit-ledger export for a regulator or compliance request. Owner
 * only. The JSON form carries the chain verification result alongside the
 * entries, so a recipient can see the hash chain was intact at export
 * time rather than having to take the file on trust.
 */
export const GET = withErrorHandling(async (req) => {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_OWNER") return jsonError(403, "Not authorized");

  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";

  const entries = await db.riskLedgerEntry.findMany({ orderBy: { sequence: "asc" } });
  const stamp = new Date().toISOString().slice(0, 10);

  await logActivity({
    userId: session.userId,
    action: "LEDGER_EXPORTED",
    description: `${entries.length} entries as ${format.toUpperCase()}`,
  });

  if (format === "csv") {
    const header = "sequence,createdAt,prevHash,currentHash,payload";
    const rows = entries.map((e) =>
      [
        csvCell(String(e.sequence)),
        csvCell(e.createdAt.toISOString()),
        csvCell(e.prevHash),
        csvCell(e.currentHash),
        csvCell(e.payload),
      ].join(",")
    );

    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="oqran-ledger-${stamp}.csv"`,
      },
    });
  }

  const verification = await verifyStoredChain();

  return new NextResponse(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        entryCount: entries.length,
        chainVerification: verification,
        entries: entries.map((e) => ({
          sequence: e.sequence,
          createdAt: e.createdAt.toISOString(),
          prevHash: e.prevHash,
          currentHash: e.currentHash,
          payload: e.payload,
        })),
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="oqran-ledger-${stamp}.json"`,
      },
    }
  );
});
