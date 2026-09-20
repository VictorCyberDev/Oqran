import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { CaseWorkPanel } from "@/components/gov/CaseWorkPanel";
import {
  CASE_SOURCE_LABEL,
  CASE_SOURCE_TONE,
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
} from "@/lib/cases";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const record = await db.case.findUnique({
    where: { id },
    include: {
      address: true,
      incident: { select: { type: true, referenceCode: true, createdAt: true } },
      fraudSignal: { select: { signalType: true, watchlistRef: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { displayName: true, email: true, role: true } } },
      },
    },
  });
  if (!record) notFound();

  const facts = [
    { k: "Reference", v: record.referenceCode },
    { k: "Raised by", v: record.originLabel ?? "—" },
    { k: "Opened", v: record.createdAt.toLocaleString("en-NG") },
    ...(record.incident
      ? [{ k: "Linked incident", v: `${record.incident.type} · ${record.incident.referenceCode}` }]
      : []),
    ...(record.fraudSignal
      ? [
          {
            k: "Fraud signal",
            v: `${record.fraudSignal.signalType}${
              record.fraudSignal.watchlistRef ? ` · ${record.fraudSignal.watchlistRef}` : ""
            }`,
          },
        ]
      : []),
    ...(record.address
      ? [
          {
            k: "Confidence tier",
            v: record.address.confidenceTier.replace(/_/g, " "),
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <BackHeader title="Case" href="/gov/cases" />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={CASE_SOURCE_TONE[record.source]}>{CASE_SOURCE_LABEL[record.source]}</Badge>
        <Badge tone={CASE_STATUS_TONE[record.status]}>{CASE_STATUS_LABEL[record.status]}</Badge>
        <Badge tone={RISK_BADGE_TONE[record.severity.toLowerCase()]}>
          {record.severity[0] + record.severity.slice(1).toLowerCase()}
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-bold leading-snug text-text-primary">
          {record.address?.label ?? record.title}
        </h1>
        {record.address && (
          <p className="mt-0.5 text-xs font-medium text-text-primary/45">
            {record.address.latitude.toFixed(4)}, {record.address.longitude.toFixed(4)}
          </p>
        )}
      </div>

      {record.summary && (
        <Card className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
            Context from the originator
          </span>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary/75">
            {record.summary}
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-2.5 rounded-2xl border border-border-subtle bg-bg-surface p-4">
        {facts.map((f) => (
          <div key={f.k} className="flex items-start justify-between gap-3">
            <span className="text-xs font-medium text-text-primary/55">{f.k}</span>
            <span className="text-right text-xs font-semibold text-text-primary">{f.v}</span>
          </div>
        ))}
      </div>

      <Card>
        <CaseWorkPanel caseId={record.id} currentStatus={record.status} />
      </Card>

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">
          Investigation trail{record.notes.length > 0 ? ` (${record.notes.length})` : ""}
        </h2>
        {record.notes.length === 0 ? (
          <p className="text-sm text-text-primary/50">
            No notes yet. Anything you add is kept with the case so the next investigator sees it.
          </p>
        ) : (
          <div className="flex flex-col">
            {record.notes.map((n) => (
              <div key={n.id} className="border-b border-border-divider py-3 last:border-b-0">
                <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
                  {n.body}
                </p>
                <p className="mt-1 text-2xs font-medium text-text-primary/45">
                  {n.author?.displayName ?? n.author?.email ?? "Investigator"} ·{" "}
                  {n.createdAt.toLocaleString("en-NG")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
