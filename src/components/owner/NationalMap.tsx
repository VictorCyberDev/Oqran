"use client";

import { useState } from "react";
import { SpatialMap, type MapIncident } from "@/components/gov/SpatialMap";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";

/**
 * The Government map reused unchanged for the owner's national view —
 * same component, same basemap fix, no map-click marking (the owner
 * observes platform-wide density rather than working individual cases).
 */
export function NationalMap({ incidents }: { incidents: MapIncident[] }) {
  const [selected, setSelected] = useState<MapIncident | null>(null);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-2xl border border-border-subtle">
      <SpatialMap incidents={incidents} filter="" onSelect={setSelected} />

      {selected && (
        <div className="absolute right-3 top-3 w-64 rounded-xl border border-border-subtle bg-bg-surface p-3.5 shadow-elevation-lg">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-bold leading-snug text-text-primary">
              {selected.address?.label ?? selected.type}
            </span>
            <Badge tone={RISK_BADGE_TONE[selected.severity.toLowerCase()]}>
              {selected.severity[0] + selected.severity.slice(1).toLowerCase()}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-text-primary/55">
            {selected.type} · {new Date(selected.createdAt).toLocaleDateString("en-NG")}
          </p>
          <button
            onClick={() => setSelected(null)}
            className="mt-2 text-xs font-semibold text-brand"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
