import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeZoneRisk } from "@/lib/geo/zone-risk";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";

export default async function ZoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const zone = await db.zone.findFirst({ where: { id, businessId: session.userId } });
  if (!zone) notFound();

  const risk = await computeZoneRisk(zone);

  return (
    <AppShell>
      <BackHeader title="Zone Risk Report" href="/business" />
      <Card className="flex flex-col gap-3.5">
        <span className="text-md font-bold text-text-primary">{zone.name}</span>
        <span className="text-xs font-medium text-text-primary/55">{zone.type}</span>
        <div className="h-px bg-border-subtle" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary/60">Risk level</span>
          <Badge tone={RISK_BADGE_TONE[risk.severity.toLowerCase()]}>
            {risk.severity[0] + risk.severity.slice(1).toLowerCase()}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
              Incidents (90d)
            </p>
            <p className="text-sm font-semibold text-text-primary">{risk.incidents90d}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">Trend</p>
            <p className="text-sm font-semibold text-text-primary">{risk.trend}</p>
          </div>
        </div>
        <p className="text-xs font-medium text-text-primary/45">
          No personal identity data is included at the business access tier.
        </p>
      </Card>
    </AppShell>
  );
}
