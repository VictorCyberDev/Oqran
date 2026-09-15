import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";

export default async function CitizenHome() {
  const session = await getSession();
  if (!session) return null;

  const [user, verifiedAddress, activity] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.address.findFirst({
      where: { verifiedById: session.userId },
      orderBy: { updatedAt: "desc" },
    }),
    db.activityLog.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  const name = user?.displayName ?? user?.phone ?? user?.email ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <RoleHeader roleLabel="Citizen" initial={name[0]?.toUpperCase() ?? "U"} />

      <div>
        <h1 className="text-4xl font-bold text-text-primary">
          {greeting}, {name}
        </h1>
        <p className="mt-0.5 text-xs font-medium text-text-primary/45">
          One identity, one profile — linked to your NIN
        </p>
      </div>

      {verifiedAddress ? (
        <Card className="flex flex-col gap-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">
            Your Verified Address
          </span>
          <span className="text-md font-bold leading-snug text-text-primary">
            {verifiedAddress.label}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-risk-low">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified · {verifiedAddress.confidenceTier.replace(/_/g, " ")}
          </span>
          <div className="h-px bg-border-subtle" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary/60">Area risk</span>
            <Badge tone={RISK_BADGE_TONE[verifiedAddress.severity.toLowerCase()]}>
              {verifiedAddress.severity[0] + verifiedAddress.severity.slice(1).toLowerCase()}
            </Badge>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">
            No verified address yet
          </span>
          <span className="text-sm text-text-primary/60">
            Verify your address to see your area&rsquo;s risk status here.
          </span>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        <Link href="/citizen/incident">
          <Button fullWidth>Report an Incident</Button>
        </Link>
        <Link href="/citizen/address">
          <Button fullWidth variant="secondary">
            Verify an Address
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
              <div key={item.id} className="flex items-center gap-3 border-b border-border-divider py-3">
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
