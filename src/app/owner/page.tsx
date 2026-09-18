import {
  getSignupsByWeek,
  getOrganizations,
  getBusinessAccountCount,
  getPlatformUsage,
  getSystemHealth,
} from "@/lib/owner/dashboard-data";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { SignupsChart } from "@/components/owner/SignupsChart";

const PLAN_LABEL: Record<string, string> = { FREE: "Free", STANDARD: "Standard", ENTERPRISE: "Enterprise" };

export default async function OwnerDashboard() {
  const [weeks, organizations, businessAccounts, usage, health] = await Promise.all([
    getSignupsByWeek(),
    getOrganizations(),
    getBusinessAccountCount(),
    getPlatformUsage(),
    getSystemHealth(),
  ]);

  return (
    <AppShell className="max-w-4xl">
      <RoleHeader roleLabel="Platform Owner" initial="O" />
      <h1 className="text-3xl font-bold text-text-primary">Platform Overview</h1>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">New signups (last 12 weeks)</h2>
        <Card>
          <SignupsChart weeks={weeks} />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Organizations</h2>
        <div className="flex flex-col gap-2.5">
          {organizations.map((org) => (
            <Card key={org.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-text-primary">{org.name}</p>
                <p className="mt-0.5 text-xs font-medium text-text-primary/50">
                  {org.type} · {org.userCount} user{org.userCount === 1 ? "" : "s"} · onboarded{" "}
                  {org.createdAt.toLocaleDateString("en-NG")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={org.verificationStatus === "VERIFIED" ? "low" : "guarded"}>
                  {org.verificationStatus}
                </Badge>
                {org.subscription && (
                  <span className="text-2xs font-medium text-text-primary/45">
                    {PLAN_LABEL[org.subscription.planTier]} · {org.subscription.status}
                  </span>
                )}
              </div>
            </Card>
          ))}
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-text-primary">Business accounts</p>
              <p className="mt-0.5 text-xs font-medium text-text-primary/50">
                Individual accounts — Business has no organization concept yet (see the org-management
                proposal)
              </p>
            </div>
            <Badge tone="neutral">{businessAccounts}</Badge>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Subscriptions</h2>
        <p className="-mt-2 mb-3 text-xs font-medium text-text-primary/45">
          No payment provider is wired yet — this is a structured placeholder, manually entered per org.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="bg-bg-surface-sunken">
              <tr className="text-left text-xs font-semibold text-text-primary/50">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {organizations
                .filter((o) => o.subscription)
                .map((org) => (
                  <tr key={org.id} className="border-t border-border-divider">
                    <td className="px-4 py-3 font-semibold text-text-primary">{org.name}</td>
                    <td className="px-4 py-3 text-text-primary">{PLAN_LABEL[org.subscription!.planTier]}</td>
                    <td className="px-4 py-3">
                      <Badge tone={org.subscription!.status === "ACTIVE" ? "low" : "guarded"}>
                        {org.subscription!.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-primary">
                      ₦{org.subscription!.amount.toLocaleString("en-NG")}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {org.subscription!.billingCycle === "MONTHLY" ? "Monthly" : "Annual"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Platform-wide usage</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Incidents reported" value={usage.totalIncidents} />
          <StatTile label="Address verifications run" value={usage.totalVerifications} />
          <StatTile label="Developer API calls" value={usage.totalApiCalls} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">System health (last 24h)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile label="Successful sign-ins" value={health.signInsLast24h} />
          <StatTile
            label="Failed OTP attempts"
            value={health.failedOtpAttemptsLast24h}
            caption="From OtpCode.attemptCount — no persisted 5xx/error log exists yet (see notes)."
          />
        </div>
      </div>
    </AppShell>
  );
}
