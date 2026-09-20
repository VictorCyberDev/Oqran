import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeZoneRisk } from "@/lib/geo/zone-risk";
import { summariseIncidents, riskBandAdvice } from "@/lib/geo/summary";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { AddZoneForm } from "@/components/business/AddZoneForm";
import type { RiskSeverity } from "@/generated/prisma/enums";

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  LOW: 0,
  GUARDED: 1,
  ELEVATED: 2,
  CRITICAL: 3,
};

export default async function BusinessHome() {
  const session = await getSession();
  if (!session) return null;

  const [viewer, zones] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.zone.findMany({ where: { businessId: session.userId }, orderBy: { createdAt: "desc" } }),
  ]);
  const isLead = viewer?.orgRole === "LEAD" && !!viewer.organizationId;

  const risks = await Promise.all(zones.map((z) => computeZoneRisk(z)));
  const rows = zones.map((zone, i) => ({
    zone,
    risk: risks[i],
    summary: summariseIncidents(risks[i].incidents, 30),
    advice: riskBandAdvice(risks[i].severity),
  }));

  const needsAttention = rows.filter(
    (r) => SEVERITY_RANK[r.risk.severity] >= SEVERITY_RANK.ELEVATED
  ).length;
  const incidents30d = rows.reduce(
    (sum, r) => sum + r.risk.incidents.filter((i) => i.ageDays <= 30).length,
    0
  );

  return (
    <AppShell>
      <RoleHeader roleLabel="Business" initial="B" />

      <div>
        <h1 className="text-3xl font-bold text-text-primary">Zone overview</h1>
        <p className="mt-0.5 text-xs font-medium text-text-primary/45">
          Where your deliveries, sites and corridors stand right now
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/account/team"
          className={
            isLead
              ? "rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white"
              : "rounded-full bg-bg-surface-sunken px-3.5 py-2 text-xs font-semibold text-text-primary/70"
          }
        >
          {isLead ? "Manage my team" : "My team"}
        </Link>
        <Link
          href="/citizen/street"
          className="rounded-full bg-bg-surface-sunken px-3.5 py-2 text-xs font-semibold text-text-primary/70"
        >
          Check any address
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Zones" value={zones.length} />
        <StatTile label="Need attention" value={needsAttention} />
        <StatTile label="Incidents 30d" value={incidents30d} />
      </div>

      {rows.length === 0 && (
        <Card className="flex flex-col gap-2">
          <span className="text-md font-bold text-text-primary">Track your first zone</span>
          <p className="text-sm leading-relaxed text-text-primary/60">
            Add a delivery zone, warehouse or route corridor and OQRAN will keep a running risk
            read on it from incident reports in that area — so a dispatcher sees the problem
            before the driver does.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {rows.map(({ zone, risk, summary, advice }) => (
            <Link
              key={zone.id}
              href={`/business/${zone.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-md font-bold text-text-primary">{zone.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-text-primary/50">{zone.type}</p>
                </div>
                <Badge tone={RISK_BADGE_TONE[risk.severity.toLowerCase()]}>
                  {risk.severity[0] + risk.severity.slice(1).toLowerCase()}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-text-primary/75">
                {summary} {advice}
              </p>
            </Link>
          ))}
        <AddZoneForm />
      </div>
    </AppShell>
  );
}
