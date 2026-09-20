import Link from "next/link";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/dates";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { SimulatedTag, SimulatedLabel } from "@/components/ui/SimulatedTag";
import { SlaTimer } from "@/components/bank/SlaTimer";
import { NinLookupPanel } from "@/components/bank/NinLookupPanel";
import { simulateAddressActivity } from "@/lib/simulation";
import { categorize, FRAUD_FILTERS, type FraudCategory } from "@/lib/fraud-category";
import { cn } from "@/lib/cn";

export default async function BankDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const now = nowMs();

  const session = await getSession();
  const viewer = session ? await db.user.findUnique({ where: { id: session.userId } }) : null;
  const isLead = viewer?.orgRole === "LEAD" && !!viewer.organizationId;

  const [signals, escalatedCount] = await Promise.all([
    db.fraudSignal.findMany({ orderBy: { flaggedAt: "desc" }, take: 50, include: { address: true } }),
    db.case.count({
      where: {
        source: "BANK_ESCALATION",
        ...(viewer?.organizationId
          ? { raisedBy: { organizationId: viewer.organizationId } }
          : { raisedById: session?.userId }),
      },
    }),
  ]);

  const open = signals.filter((s) => !s.resolvedAt);
  const breaching = open.filter((s) => s.slaDeadline.getTime() < now);
  const watchlistHits = signals.filter((s) => s.watchlistRef);

  // The patterns a single bank cannot see on its own: the same address
  // being checked again and again, or by several institutions at once.
  const patternRows = signals
    .filter((s) => s.address)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      label: s.address!.label,
      activity: simulateAddressActivity(s.address!.id),
    }));

  const filtered =
    filter && filter !== "all"
      ? signals.filter((s) => categorize(s.signalType) === (filter as FraudCategory))
      : signals;

  return (
    <AppShell>
      <RoleHeader roleLabel="Compliance" initial="A" />

      <div>
        <h1 className="text-3xl font-bold text-text-primary">Compliance desk</h1>
        <p className="mt-0.5 text-xs font-medium text-text-primary/45">
          Address and identity risk your own records can&rsquo;t show you on their own
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="#feed"
          className="rounded-full bg-bg-surface-sunken px-3.5 py-2 text-xs font-semibold text-text-primary/70"
        >
          Fraud signal feed
        </a>
        <Link
          href="/account/activity"
          className="rounded-full bg-bg-surface-sunken px-3.5 py-2 text-xs font-semibold text-text-primary/70"
        >
          My activity
        </Link>
      </div>

      {/* A pill in the chip row above read as a filter rather than
          navigation, so leads couldn't find their team screen. Given its
          own row it matches the Government dashboard's case banner. */}
      {isLead && (
        <Link
          href="/bank/team"
          className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-4 py-3"
        >
          <div>
            <p className="text-sm font-bold text-text-primary">Manage my team</p>
            <p className="text-xs font-medium text-text-primary/55">
              Invite or remove compliance staff in your organization
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-brand">Open →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Open signals" value={open.length} caption="Awaiting review" />
        <StatTile
          label="Past SLA"
          value={breaching.length}
          caption={breaching.length ? "Needs attention now" : "All within 30 min"}
        />
        <StatTile label="Watchlist hits" value={watchlistHits.length} caption="CBN/NIBSS matches" />
        <StatTile
          label="Escalated"
          value={escalatedCount}
          caption="Cases raised to Government"
        />
      </div>

      <NinLookupPanel />

      {patternRows.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-md font-bold text-text-primary">Cross-institution activity</span>
            <SimulatedLabel detail="pending inter-bank data-sharing agreements">
              Who else is checking these addresses
            </SimulatedLabel>
          </div>
          <div className="flex flex-col">
            {patternRows.map((row) => (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 border-b border-border-divider py-2.5 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-snug text-text-primary">{row.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-text-primary/55">
                    {row.activity.verificationAttempts24h} verification attempts in the last 24 hours ·{" "}
                    {row.activity.distinctInstitutions7d}{" "}
                    {row.activity.distinctInstitutions7d === 1 ? "institution" : "institutions"} this week
                  </p>
                </div>
                <span className="shrink-0 text-2xs font-semibold text-text-primary/40">
                  {row.activity.hoursSinceLastQuery}h ago
                </span>
              </div>
            ))}
          </div>
          <p className="text-2xs font-medium text-text-primary/45">
            <SimulatedTag detail="pending inter-bank data-sharing agreements" /> — with real
            participation these counts come from other institutions&rsquo; live lookups.
          </p>
        </Card>
      )}

      <div id="feed" className="flex flex-col gap-3 scroll-mt-4">
        <div className="flex items-center gap-2">
          <StatusDot tone="low" pulse />
          <span className="text-sm font-semibold text-text-primary">Fraud Signal Feed · Live</span>
        </div>
        <p className="-mt-2 text-xs font-semibold text-text-primary/40">
          30-min response SLA · cross-referenced against the CBN/NIBSS public watchlist
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FRAUD_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/bank#feed" : `/bank?filter=${f.key}#feed`}
              className={cn(
                "flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold",
                (filter ?? "all") === f.key
                  ? "bg-brand text-white"
                  : "bg-bg-surface-sunken text-text-primary/65"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-text-primary/50">
              No signals in this filter.
            </p>
          )}
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/bank/${s.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge tone={RISK_BADGE_TONE[s.severity.toLowerCase()]}>
                    {s.severity[0] + s.severity.slice(1).toLowerCase()}
                  </Badge>
                  {s.watchlistRef && <Badge tone="watchlist">Watchlist Match</Badge>}
                </div>
                <SlaTimer
                  slaDeadline={s.slaDeadline.toISOString()}
                  resolved={!!s.resolvedAt}
                  serverNow={now}
                />
              </div>
              <span className="text-md font-bold leading-snug text-text-primary">
                {s.entityLabel}
              </span>
              <span className="text-xs font-medium text-text-primary/50">{s.signalType}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
