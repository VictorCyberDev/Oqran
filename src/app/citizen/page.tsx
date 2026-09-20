import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";
import { riskBandHeadline } from "@/lib/geo/summary";
import type { RiskSeverity } from "@/generated/prisma/enums";

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  LOW: 0,
  GUARDED: 1,
  ELEVATED: 2,
  CRITICAL: 3,
};

export default async function CitizenHome() {
  const session = await getSession();
  if (!session) return null;

  const [user, savedPlaces, myReports, activity] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.savedPlace.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
      include: { address: true },
    }),
    db.incident.findMany({
      where: { reporterId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { address: { select: { label: true, severity: true } } },
    }),
    db.activityLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const name = user?.displayName ?? user?.email ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // "Since you last looked" — compare each saved place's current severity
  // against what it was on the previous visit, then record the new value
  // so the flag clears once it has been seen.
  const places = savedPlaces.map((p) => ({
    id: p.id,
    label: p.label,
    addressLabel: p.address.label,
    severity: p.address.severity,
    rose: SEVERITY_RANK[p.address.severity] > SEVERITY_RANK[p.lastSeenSeverity],
    previous: p.lastSeenSeverity,
  }));

  const changed = places.filter((p) => p.rose);
  if (changed.length > 0) {
    await Promise.all(
      changed.map((p) =>
        db.savedPlace.update({ where: { id: p.id }, data: { lastSeenSeverity: p.severity } })
      )
    );
  }

  // A report "counted" when the area it was filed against now carries a
  // raised risk band — the clearest honest link between reporting and
  // the map everyone else sees.
  const contributing = myReports.filter(
    (r) => r.address && SEVERITY_RANK[r.address.severity] >= SEVERITY_RANK.ELEVATED
  ).length;

  const reportsLast90 = myReports.filter((r) => r.createdAt >= daysAgo(90)).length;

  return (
    <AppShell>
      <RoleHeader roleLabel="Citizen" initial={name[0]?.toUpperCase() ?? "U"} />

      <div>
        <h1 className="text-3xl font-bold text-text-primary">
          {greeting}, {name}
        </h1>
        <p className="mt-0.5 text-xs font-medium text-text-primary/45">
          Know a place before you go
        </p>
      </div>

      <Link href="/citizen/street">
        <Card className="flex items-center justify-between gap-3 border-brand/30 bg-brand/[0.06]">
          <div>
            <p className="text-md font-bold text-text-primary">Checking a new place?</p>
            <p className="mt-0.5 text-xs font-medium leading-relaxed text-text-primary/60">
              Marketplace meetup, a flat viewing, or sending a delivery — see what&rsquo;s been
              reported there first.
            </p>
          </div>
          <span className="shrink-0 text-xl font-bold text-brand">→</span>
        </Card>
      </Link>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-md font-bold text-text-primary">My places</h2>
          <Link href="/citizen/street" className="text-xs font-semibold text-brand">
            Add a place
          </Link>
        </div>

        {places.length === 0 ? (
          <Card className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">
              Save the places that matter
            </span>
            <p className="text-sm leading-relaxed text-text-primary/60">
              Pin home, work or a relative&rsquo;s address and you&rsquo;ll see their current risk
              level here — and get told when it changes.
            </p>
            <Link href="/citizen/street" className="text-sm font-semibold text-brand">
              Check a place to save it →
            </Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {places.map((p) => (
              <Card key={p.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary">{p.label}</p>
                    <p className="truncate text-xs font-medium text-text-primary/50">
                      {p.addressLabel}
                    </p>
                  </div>
                  <Badge tone={RISK_BADGE_TONE[p.severity.toLowerCase()]}>
                    {p.severity[0] + p.severity.slice(1).toLowerCase()}
                  </Badge>
                </div>
                {p.rose && (
                  <div className="flex items-center gap-2 rounded-lg bg-risk-elevated/[0.12] px-3 py-2">
                    <StatusDot tone="elevated" pulse />
                    <span className="text-xs font-semibold text-text-primary/80">
                      Risk increased near &ldquo;{p.label}&rdquo; — was{" "}
                      {p.previous[0] + p.previous.slice(1).toLowerCase()}
                    </span>
                  </div>
                )}
                <p className="text-xs font-medium text-text-primary/55">
                  {riskBandHeadline(p.severity)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">My reports</h2>
        {myReports.length === 0 ? (
          <Card className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-primary">
              Your reports shape the map
            </span>
            <p className="text-sm leading-relaxed text-text-primary/60">
              Every report you file feeds the risk level other people see before they visit an
              area. Nothing you report identifies you to them.
            </p>
            <Link href="/citizen/incident" className="text-sm font-semibold text-brand">
              Report an incident →
            </Link>
          </Card>
        ) : (
          <Card className="flex flex-col gap-3">
            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-2xl font-bold tabular-nums text-text-primary">
                  {myReports.length}
                </p>
                <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
                  Reports filed
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-text-primary">{contributing}</p>
                <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
                  In areas now flagged
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-text-primary">
                  {reportsLast90}
                </p>
                <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
                  Last 90 days
                </p>
              </div>
            </div>

            {contributing > 0 && (
              <p className="rounded-lg bg-bg-surface-sunken px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-text-primary/75">
                {contributing === 1
                  ? "Your report contributed to an area being flagged as elevated risk or higher."
                  : `Your reports contributed to ${contributing} areas being flagged as elevated risk or higher.`}
              </p>
            )}

            <div className="flex flex-col">
              {myReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 border-b border-border-divider py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{r.type}</p>
                    <p className="truncate text-xs font-medium text-text-primary/50">
                      {r.address?.label ?? "Location pinned"} ·{" "}
                      {r.createdAt.toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <Badge tone={RISK_BADGE_TONE[r.severity.toLowerCase()]}>
                    {r.severity[0] + r.severity.slice(1).toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Link href="/citizen/incident">
          <Button fullWidth>Report an Incident</Button>
        </Link>
        <Link href="/citizen/address">
          <Button fullWidth variant="secondary">
            Verify my Address
          </Button>
        </Link>
        <Link href="/citizen/risk-safety">
          <Button fullWidth variant="ghost">
            View my Risk &amp; Safety
          </Button>
        </Link>
      </div>

      {activity.length > 0 && (
        <div>
          <h2 className="mb-2 text-md font-bold text-text-primary">Recent activity</h2>
          <div className="flex flex-col">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-b border-border-divider py-3 last:border-b-0"
              >
                <StatusDot
                  tone={
                    item.action === "INCIDENT_REPORTED"
                      ? "elevated"
                      : item.action === "ADDRESS_VERIFIED"
                        ? "low"
                        : "neutral"
                  }
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {item.description ?? item.action}
                  </p>
                  <p className="text-xs font-medium text-text-primary/50">
                    {item.createdAt.toLocaleString("en-NG")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
