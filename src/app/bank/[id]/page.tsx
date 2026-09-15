import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/dates";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { SlaTimer } from "@/components/bank/SlaTimer";
import { EscalateButton } from "@/components/bank/EscalateButton";
import { MapOverlayPanel } from "@/components/ui/MapOverlayPanel";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const signal = await db.fraudSignal.findUnique({ where: { id }, include: { address: true } });
  if (!signal) notFound();

  const meta = [
    { k: "First seen", v: signal.flaggedAt.toLocaleString("en-NG") },
    { k: "Source", v: signal.source === "PUBLIC_WATCHLIST" ? "CBN/NIBSS Watchlist" : "Internal report" },
    { k: "CBN/NIBSS Watchlist", v: signal.watchlistRef ?? "No match" },
  ];

  return (
    <AppShell>
      <BackHeader title="Signal Detail" href="/bank" />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={RISK_BADGE_TONE[signal.severity.toLowerCase()]}>
          {signal.severity[0] + signal.severity.slice(1).toLowerCase()}
        </Badge>
        {signal.watchlistRef && <Badge tone="watchlist">Watchlist Match</Badge>}
        <SlaTimer slaDeadline={signal.slaDeadline.toISOString()} resolved={!!signal.resolvedAt} serverNow={nowMs()} />
      </div>

      <div>
        <p className="text-xl font-bold leading-snug text-text-primary">{signal.entityLabel}</p>
        <p className="text-sm font-medium text-text-primary/55">{signal.signalType}</p>
      </div>

      <div className="relative h-36 overflow-hidden rounded-2xl border border-border-subtle bg-map-surface bg-[radial-gradient(circle_at_45%_40%,rgba(140,27,46,0.18),transparent_60%)]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {signal.address && (
          <MapOverlayPanel className="absolute bottom-2 left-2 right-2 text-2xs">
            {signal.address.label} · {signal.address.latitude.toFixed(4)}, {signal.address.longitude.toFixed(4)}
          </MapOverlayPanel>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-border-subtle bg-bg-surface p-4">
        {meta.map((m) => (
          <div key={m.k} className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-primary/55">{m.k}</span>
            <span className="text-xs font-semibold text-text-primary">{m.v}</span>
          </div>
        ))}
      </div>

      <a
        href={`/api/bank/signals/${signal.id}/export`}
        className="rounded-lg bg-brand px-4 py-3.5 text-center text-sm font-bold text-white"
      >
        Export Report
      </a>
      <EscalateButton signalId={signal.id} resolved={!!signal.resolvedAt} />
    </AppShell>
  );
}
