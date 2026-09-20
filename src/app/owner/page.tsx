import {
  getSignupsByWeek,
  getOrganizations,
  getBusinessAccountCount,
  getPlatformUsage,
  getSystemHealth,
  getRateLimitHotspots,
  getAnomalySignals,
  getFraudSlaOverview,
  getConfidenceTierBreakdown,
  getNationalIncidents,
} from "@/lib/owner/dashboard-data";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { StatusDot } from "@/components/ui/StatusDot";
import { SignupsChart } from "@/components/owner/SignupsChart";
import { NationalMap } from "@/components/owner/NationalMap";

const PLAN_LABEL: Record<string, string> = { FREE: "Free", STANDARD: "Standard", ENTERPRISE: "Enterprise" };

const TIER_LABEL: Record<string, string> = {
  NIMC_CERTIFIED: "NIMC-certified",
  STATE_GIS: "State GIS",
  CROWD_REPORTED: "Crowd-reported",
};

const TIER_TONE: Record<string, "low" | "guarded" | "elevated"> = {
  NIMC_CERTIFIED: "low",
  STATE_GIS: "guarded",
  CROWD_REPORTED: "elevated",
};

export default async function OwnerDashboard() {
  const [
    weeks,
    organizations,
    businessAccounts,
    usage,
    health,
    hotspots,
    anomalies,
    fraudSla,
    tiers,
    nationalIncidents,
  ] = await Promise.all([
    getSignupsByWeek(),
    getOrganizations(),
    getBusinessAccountCount(),
    getPlatformUsage(),
    getSystemHealth(),
    getRateLimitHotspots(),
    getAnomalySignals(),
    getFraudSlaOverview(),
    getConfidenceTierBreakdown(),
    getNationalIncidents(),
  ]);

  const firing = anomalies.filter((a) => a.triggered);

  return (
    <AppShell className="max-w-4xl">
      <RoleHeader roleLabel="Platform Owner" initial="O" />
      <h1 className="text-3xl font-bold text-text-primary">Platform Overview</h1>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Anomaly watch</h2>
        <p className="-mt-2 mb-3 text-xs font-medium text-text-primary/45">
          Each flag compares the last hour against that metric&rsquo;s own hourly average over the
          previous 7 days, and only fires above a small absolute floor — so a quiet platform
          doesn&rsquo;t flag constantly.
        </p>
        <div className="flex flex-col gap-2.5">
          {anomalies.map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5">
                  <StatusDot tone={a.triggered ? "critical" : "low"} pulse={a.triggered} />
                </span>
                <div>
                  <p className="text-sm font-bold text-text-primary">{a.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-text-primary/55">{a.detail}</p>
                </div>
              </div>
              <Badge tone={a.triggered ? "critical" : "low"}>
                {a.triggered ? "Flagged" : "Normal"}
              </Badge>
            </Card>
          ))}
          {firing.length === 0 && (
            <p className="text-xs font-medium text-text-primary/45">
              Nothing above threshold in the last hour.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">
          Rate-limit hotspots (last 24h)
        </h2>
        <p className="-mt-2 mb-3 text-xs font-medium text-text-primary/45">
          Busiest limiter keys — repeated failed sign-ins, hammered invite codes and scripted
          lookups all land here.
        </p>
        {hotspots.length === 0 ? (
          <Card>
            <p className="text-sm text-text-primary/55">
              No rate-limited activity recorded in the last 24 hours.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-subtle">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead className="bg-bg-surface-sunken">
                <tr className="text-left text-xs font-semibold text-text-primary/50">
                  <th className="px-4 py-3">Limiter</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Hits</th>
                  <th className="px-4 py-3">Windows</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((h) => (
                  <tr key={`${h.category}:${h.subject}`} className="border-t border-border-divider">
                    <td className="px-4 py-3 font-mono text-2xs text-text-primary">{h.category}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-mono text-2xs text-text-primary/70">
                      {h.subject}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-text-primary">
                      {h.hits}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-primary/60">{h.windows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Fraud SLA — every bank</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Open, within SLA" value={fraudSla.openWithinSla} />
          <StatTile
            label="Open, past SLA"
            value={fraudSla.openPastSla}
            caption={fraudSla.openPastSla > 0 ? "Needs chasing" : "None overdue"}
          />
          <StatTile label="Resolved" value={fraudSla.resolvedTotal} />
        </div>

        {fraudSla.byOrganization.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border-subtle">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead className="bg-bg-surface-sunken">
                <tr className="text-left text-xs font-semibold text-text-primary/50">
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Resolved</th>
                  <th className="px-4 py-3">Breached SLA</th>
                  <th className="px-4 py-3">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {fraudSla.byOrganization.map((row) => (
                  <tr key={row.organization} className="border-t border-border-divider">
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {row.organization}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-primary">{row.resolved}</td>
                    <td className="px-4 py-3">
                      <Badge tone={row.breachedAtResolution > 0 ? "elevated" : "low"}>
                        {row.breachedAtResolution}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-primary/70">
                      {row.avgMinutesToResolve === null ? "—" : `${row.avgMinutesToResolve} min`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {fraudSla.unattributed > 0 && (
          <p className="mt-2 text-xs font-medium text-text-primary/45">
            {fraudSla.unattributed} resolved signal{fraudSla.unattributed === 1 ? "" : "s"} had no
            user attached to attribute to an organization (mostly public-watchlist imports), so
            {fraudSla.unattributed === 1 ? " it is" : " they are"} excluded from the per-org table
            rather than assigned to a bank that may not own them.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Address data quality</h2>
        <p className="-mt-2 mb-3 text-xs font-medium text-text-primary/45">
          How the platform&rsquo;s {tiers.total} address record
          {tiers.total === 1 ? " was" : "s were"} established — a proxy for how much weight the
          risk model&rsquo;s inputs can carry.
        </p>
        <Card className="flex flex-col gap-3">
          {tiers.total === 0 ? (
            <p className="text-sm text-text-primary/55">No addresses on the platform yet.</p>
          ) : (
            tiers.tiers.map((t) => (
              <div key={t.tier} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">
                    {TIER_LABEL[t.tier] ?? t.tier}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-text-primary/60">
                    {t.count} · {Math.round(t.share * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-surface-sunken">
                  <div
                    className={
                      TIER_TONE[t.tier] === "low"
                        ? "h-full rounded-full bg-risk-low"
                        : TIER_TONE[t.tier] === "guarded"
                          ? "h-full rounded-full bg-risk-guarded"
                          : "h-full rounded-full bg-risk-elevated"
                    }
                    style={{ width: `${Math.round(t.share * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">National incident density</h2>
        <p className="-mt-2 mb-3 text-xs font-medium text-text-primary/45">
          Every geolocated incident on the platform ({nationalIncidents.length} shown) — owner-only
          view of the same map investigators use.
        </p>
        <NationalMap incidents={nationalIncidents} />
      </div>

      <div>
        <h2 className="mb-3 text-md font-bold text-text-primary">Audit ledger export</h2>
        <Card className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-text-primary/65">
            The full hash-chained ledger, for a regulator or compliance request. The JSON export
            includes the chain verification result alongside the entries, so a recipient can see
            the chain was intact at export time rather than taking the file on trust.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/owner/ledger/export?format=csv"
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              Download CSV
            </a>
            <a
              href="/api/owner/ledger/export?format=json"
              className="rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary"
            >
              Download JSON
            </a>
          </div>
        </Card>
      </div>

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
