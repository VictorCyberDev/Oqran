import Link from "next/link";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import {
  CASE_SOURCE_LABEL,
  CASE_SOURCE_TONE,
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
} from "@/lib/cases";
import type { CaseSource } from "@/generated/prisma/enums";

const SOURCE_FILTERS: { key: CaseSource | "all"; label: string }[] = [
  { key: "all", label: "All sources" },
  { key: "BANK_ESCALATION", label: "Bank escalations" },
  { key: "CITIZEN_REPORT", label: "Citizen reports" },
  { key: "INVESTIGATOR_FLAG", label: "Investigator-flagged" },
];

export default async function GovCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const activeSource = (source ?? "all") as CaseSource | "all";

  const [cases, openCount, bankCount, investigatingCount] = await Promise.all([
    db.case.findMany({
      where: activeSource === "all" ? {} : { source: activeSource },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { address: { select: { label: true } }, _count: { select: { notes: true } } },
    }),
    db.case.count({ where: { status: "OPEN" } }),
    db.case.count({ where: { source: "BANK_ESCALATION" } }),
    db.case.count({ where: { status: "UNDER_INVESTIGATION" } }),
  ]);

  return (
    <AppShell>
      <BackHeader title="Cases" href="/gov" />

      <div>
        <h1 className="text-3xl font-bold text-text-primary">Case queue</h1>
        <p className="mt-0.5 text-xs font-medium text-text-primary/45">
          Work raised by banks, citizens and your own investigators — in one place
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="Open" value={openCount} />
        <StatTile label="Investigating" value={investigatingCount} />
        <StatTile label="From banks" value={bankCount} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SOURCE_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/gov/cases" : `/gov/cases?source=${f.key}`}
            className={cn(
              "flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold",
              activeSource === f.key
                ? "bg-brand text-white"
                : "bg-bg-surface-sunken text-text-primary/65"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {cases.length === 0 ? (
        <Card className="flex flex-col gap-2">
          <span className="text-md font-bold text-text-primary">No cases in this view yet</span>
          <p className="text-sm leading-relaxed text-text-primary/60">
            Cases arrive three ways: a bank escalates a flagged address or identity, a citizen
            report is opened for investigation from the map, or an investigator flags a danger
            zone. Each one lands here with its origin attached.
          </p>
          <Link href="/gov" className="mt-1 text-sm font-semibold text-brand">
            Back to the map →
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/gov/cases/${c.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={CASE_SOURCE_TONE[c.source]}>{CASE_SOURCE_LABEL[c.source]}</Badge>
                <Badge tone={CASE_STATUS_TONE[c.status]}>{CASE_STATUS_LABEL[c.status]}</Badge>
                <Badge tone={RISK_BADGE_TONE[c.severity.toLowerCase()]}>
                  {c.severity[0] + c.severity.slice(1).toLowerCase()}
                </Badge>
              </div>
              <span className="text-md font-bold leading-snug text-text-primary">
                {c.address?.label ?? c.title}
              </span>
              <span className="text-xs font-medium text-text-primary/50">
                {c.referenceCode}
                {c.originLabel ? ` · from ${c.originLabel}` : ""} ·{" "}
                {c.createdAt.toLocaleDateString("en-NG")}
                {c._count.notes > 0
                  ? ` · ${c._count.notes} note${c._count.notes === 1 ? "" : "s"}`
                  : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
