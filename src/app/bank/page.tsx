import Link from "next/link";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/dates";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { SlaTimer } from "@/components/bank/SlaTimer";
import { categorize, FRAUD_FILTERS, type FraudCategory } from "@/lib/fraud-category";
import { cn } from "@/lib/cn";

export default async function BankFraudFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const now = nowMs();

  const session = await getSession();
  const [signals, viewer] = await Promise.all([
    db.fraudSignal.findMany({ orderBy: { flaggedAt: "desc" }, take: 50 }),
    session ? db.user.findUnique({ where: { id: session.userId } }) : null,
  ]);
  const isLead = viewer?.orgRole === "LEAD" && !!viewer.organizationId;

  const filtered =
    filter && filter !== "all"
      ? signals.filter((s) => categorize(s.signalType) === (filter as FraudCategory))
      : signals;

  return (
    <AppShell>
      <RoleHeader roleLabel="Compliance" initial="A" />
      {isLead && (
        <Link href="/bank/team" className="-mt-3 self-start text-xs font-semibold text-brand">
          Manage my team →
        </Link>
      )}

      <div className="flex items-center gap-2">
        <StatusDot tone="low" pulse />
        <span className="text-sm font-semibold text-text-primary">Fraud Signal Feed · Live</span>
      </div>
      <p className="-mt-3 text-xs font-semibold text-text-primary/40">
        30-min response SLA · cross-referenced against the CBN/NIBSS public watchlist
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FRAUD_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/bank" : `/bank?filter=${f.key}`}
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
          <p className="py-6 text-center text-sm text-text-primary/50">No signals in this filter.</p>
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
              <SlaTimer slaDeadline={s.slaDeadline.toISOString()} resolved={!!s.resolvedAt} serverNow={now} />
            </div>
            <span className="text-md font-bold leading-snug text-text-primary">{s.entityLabel}</span>
            <span className="text-xs font-medium text-text-primary/50">{s.signalType}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
