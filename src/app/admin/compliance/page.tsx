import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const TIER_LABEL: Record<string, string> = {
  NIMC_CERTIFIED: "NIMC-Certified",
  STATE_GIS: "State GIS-Verified",
  CROWD_REPORTED: "Crowd-Reported",
};

export default async function CompliancePage() {
  const [tierCounts, organizations] = await Promise.all([
    db.address.groupBy({ by: ["confidenceTier"], _count: { _all: true } }),
    db.organization.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const total = tierCounts.reduce((sum, t) => sum + t._count._all, 0) || 1;

  return (
    <AppShell>
      <BackHeader title="Compliance & Data Governance" href="/admin" />

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">
          Address verification provenance
        </h2>
        <Card className="flex flex-col gap-3">
          {(["NIMC_CERTIFIED", "STATE_GIS", "CROWD_REPORTED"] as const).map((tier) => {
            const count = tierCounts.find((t) => t.confidenceTier === tier)?._count._all ?? 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={tier} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                  <span>{TIER_LABEL[tier]}</span>
                  <span className="text-text-primary/50">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface-sunken">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">Organization status</h2>
        <div className="flex flex-col gap-2.5">
          {organizations.map((org) => (
            <Card key={org.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-text-primary">{org.name}</p>
                <p className="text-xs font-medium text-text-primary/50">{org.type}</p>
              </div>
              <Badge tone={org.verificationStatus === "VERIFIED" ? "low" : "guarded"}>
                {org.verificationStatus}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
