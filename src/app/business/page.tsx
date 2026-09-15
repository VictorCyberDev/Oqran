import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeZoneRisk } from "@/lib/geo/zone-risk";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { AddZoneForm } from "@/components/business/AddZoneForm";

export default async function BusinessHome() {
  const session = await getSession();
  if (!session) return null;

  const zones = await db.zone.findMany({
    where: { businessId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  const risks = await Promise.all(zones.map((z) => computeZoneRisk(z)));

  return (
    <AppShell>
      <RoleHeader roleLabel="Business" initial="B" />
      <h1 className="text-3xl font-bold text-text-primary">My Zones</h1>

      <div className="flex flex-col gap-2.5">
        {zones.map((zone, i) => (
          <Link
            key={zone.id}
            href={`/business/${zone.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-surface p-4"
          >
            <div>
              <p className="text-md font-bold text-text-primary">{zone.name}</p>
              <p className="mt-0.5 text-xs font-medium text-text-primary/50">{zone.type}</p>
            </div>
            <Badge tone={RISK_BADGE_TONE[risks[i].severity.toLowerCase()]}>
              {risks[i].severity[0] + risks[i].severity.slice(1).toLowerCase()}
            </Badge>
          </Link>
        ))}
        <AddZoneForm />
      </div>
    </AppShell>
  );
}
