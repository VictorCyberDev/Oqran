import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const NEARBY_RADIUS_DEG = 0.02; // ≈ 2km at Nigerian latitudes
const WINDOW_DAYS = 180;

export default async function RiskSafetyPage() {
  const session = await getSession();
  if (!session) return null;

  const address = await db.address.findFirst({
    where: { verifiedById: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  const nearbyIncidents = address
    ? await db.incident.findMany({
        where: {
          latitude: { gte: address.latitude - NEARBY_RADIUS_DEG, lte: address.latitude + NEARBY_RADIUS_DEG },
          longitude: { gte: address.longitude - NEARBY_RADIUS_DEG, lte: address.longitude + NEARBY_RADIUS_DEG },
          createdAt: { gte: daysAgo(WINDOW_DAYS) },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <AppShell>
      <BackHeader title="Risk & Safety" href="/citizen" />

      {!address ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm font-medium text-text-primary/60">
            Verify your address to see a personal risk view for where you live.
          </p>
          <Link href="/citizen/address">
            <Button>Verify an Address</Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">
              Current status
            </span>
            <div className="flex items-center justify-between">
              <span className="text-md font-bold text-text-primary">{address.label}</span>
              <Badge tone={RISK_BADGE_TONE[address.severity.toLowerCase()]}>
                {address.severity[0] + address.severity.slice(1).toLowerCase()}
              </Badge>
            </div>
            <p className="text-xs font-medium text-text-primary/50">
              Based on {nearbyIncidents.length} reported incident{nearbyIncidents.length === 1 ? "" : "s"}{" "}
              within ~2km over the last {WINDOW_DAYS} days.
            </p>
          </Card>

          <div>
            <h2 className="mb-2 text-md font-bold text-text-primary">Nearby activity</h2>
            {nearbyIncidents.length === 0 ? (
              <p className="text-sm text-text-primary/50">
                No incidents reported near your address recently.
              </p>
            ) : (
              <div className="flex flex-col">
                {nearbyIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between gap-3 border-b border-border-divider py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{incident.type}</p>
                      <p className="text-xs font-medium text-text-primary/50">
                        {incident.createdAt.toLocaleDateString("en-NG")}
                      </p>
                    </div>
                    <Badge tone={RISK_BADGE_TONE[incident.severity.toLowerCase()]}>
                      {incident.severity[0] + incident.severity.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
