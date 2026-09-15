"use client";

import { useState } from "react";
import Link from "next/link";
import { SpatialMap, type MapIncident } from "@/components/gov/SpatialMap";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";

export function GovDashboardClient({ incidents }: { incidents: MapIncident[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MapIncident | null>(null);

  return (
    <div className="flex h-screen flex-col bg-bg-canvas">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-extrabold tracking-[0.12em] text-brand">OQRAN</span>
        <div className="flex items-center gap-2">
          <Badge tone="brand">Investigator</Badge>
          <Link
            href="/account"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface-sunken text-sm font-semibold text-text-primary"
          >
            E
          </Link>
        </div>
      </header>

      <div className="px-5 pb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address, zone, or incident type"
        />
      </div>

      <div className="relative flex-1">
        <SpatialMap incidents={incidents} filter={query} onSelect={setSelected} />

        <div className="pointer-events-none absolute inset-x-5 top-3 hidden md:flex md:justify-end">
          {selected && (
            <div className="pointer-events-auto w-80 rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-elevation-lg">
              <SelectedSummary incident={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <Sheet open={!!selected} onClose={() => setSelected(null)}>
          {selected && <SelectedSummary incident={selected} onClose={() => setSelected(null)} />}
        </Sheet>
      </div>
    </div>
  );
}

function SelectedSummary({ incident, onClose }: { incident: MapIncident; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-md font-bold text-text-primary">
          {incident.address?.label ?? incident.type}
        </span>
        <Badge tone={RISK_BADGE_TONE[incident.severity.toLowerCase()]}>
          {incident.severity[0] + incident.severity.slice(1).toLowerCase()}
        </Badge>
      </div>
      <p className="text-xs font-medium text-text-primary/55">
        {incident.type} · {new Date(incident.createdAt).toLocaleDateString("en-NG")} · {incident.status.replace(/_/g, " ")}
      </p>
      <button onClick={onClose} className="self-start text-xs font-semibold text-brand">
        Close summary
      </button>
    </div>
  );
}
