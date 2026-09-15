import { db } from "@/lib/db";
import { verifyStoredChain } from "@/lib/ledger";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AuditLedgerPage() {
  const [verification, entries] = await Promise.all([
    verifyStoredChain(),
    db.riskLedgerEntry.findMany({ orderBy: { sequence: "desc" }, take: 30 }),
  ]);

  return (
    <AppShell>
      <BackHeader title="Audit Ledger" href="/admin" />

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-text-primary">Chain integrity</p>
          <p className="text-xs font-medium text-text-primary/50">
            {verification.totalEntries} entries verified
            {!verification.valid && ` · broken at entry ${verification.brokenAtIndex}`}
          </p>
        </div>
        <Badge tone={verification.valid ? "low" : "critical"}>
          {verification.valid ? "Verified" : "Integrity failure"}
        </Badge>
      </Card>

      <div className="flex flex-col gap-2">
        {entries.map((entry) => {
          const payload = entry.payload as Record<string, unknown>;
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-border-subtle bg-bg-surface p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">
                  {typeof payload.kind === "string" ? payload.kind.replace(/_/g, " ") : "Entry"}
                </span>
                <span className="text-2xs font-medium text-text-primary/40">#{entry.sequence}</span>
              </div>
              <p className="mt-1 truncate text-2xs font-mono text-text-primary/45">
                {entry.currentHash}
              </p>
              <p className="mt-1 text-2xs font-medium text-text-primary/40">
                {entry.createdAt.toLocaleString("en-NG")}
              </p>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
