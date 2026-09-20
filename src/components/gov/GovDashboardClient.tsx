"use client";

import { useState } from "react";
import Link from "next/link";
import { SpatialMap, type MapIncident } from "@/components/gov/SpatialMap";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { SimulatedTag, SimulatedLabel } from "@/components/ui/SimulatedTag";

const TIER_LABEL: Record<string, string> = {
  NIMC_CERTIFIED: "NIMC-Certified",
  STATE_GIS: "State GIS-Verified",
  CROWD_REPORTED: "Crowd-Reported",
};

interface InvestigatedAddress {
  id: string;
  label: string;
  confidenceTier: string;
  source: string;
  severity: "LOW" | "GUARDED" | "ELEVATED" | "CRITICAL";
  riskScore: number;
}

interface Investigation {
  pin?: { latitude: number; longitude: number };
  status: "loading" | "ready" | "error";
  error?: string;
  address?: InvestigatedAddress;
  ninInput: string;
  ninBusy: boolean;
  ninResult?: { matched: boolean };
  flagged: boolean;
  flagBusy: boolean;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function GovDashboardClient({
  incidents: initialIncidents,
  isLead,
}: {
  incidents: MapIncident[];
  isLead: boolean;
}) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MapIncident | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);

  async function runInvestigate(payload: { query?: string; latitude?: number; longitude?: number }) {
    setSelected(null);
    setInvestigation({
      pin: payload.latitude !== undefined ? { latitude: payload.latitude, longitude: payload.longitude! } : undefined,
      status: "loading",
      ninInput: "",
      ninBusy: false,
      flagged: false,
      flagBusy: false,
    });
    const res = await postJson("/api/gov/investigate", payload);
    if (!res.ok) {
      setInvestigation((prev) => (prev ? { ...prev, status: "error", error: res.error ?? "Something went wrong." } : prev));
      return;
    }
    setInvestigation((prev) =>
      prev
        ? {
            ...prev,
            status: "ready",
            address: res.address,
            pin: { latitude: res.address.latitude, longitude: res.address.longitude },
          }
        : prev
    );
  }

  async function checkNin() {
    if (!investigation?.address) return;
    setInvestigation((prev) => (prev ? { ...prev, ninBusy: true } : prev));
    const res = await postJson("/api/gov/investigate", {
      latitude: investigation.pin?.latitude,
      longitude: investigation.pin?.longitude,
      nin: investigation.ninInput,
    });
    setInvestigation((prev) => {
      if (!prev) return prev;
      if (!res.ok) return { ...prev, ninBusy: false, error: res.error };
      return { ...prev, ninBusy: false, address: res.address, ninResult: res.ninResult };
    });
  }

  async function flagDangerous() {
    if (!investigation?.address) return;
    setInvestigation((prev) => (prev ? { ...prev, flagBusy: true } : prev));
    const res = await postJson("/api/gov/flag-danger", { addressId: investigation.address.id });
    if (!res.ok) {
      setInvestigation((prev) => (prev ? { ...prev, flagBusy: false, error: res.error } : prev));
      return;
    }
    setIncidents((prev) => [res.incident, ...prev]);
    setInvestigation((prev) => (prev ? { ...prev, flagBusy: false, flagged: true } : prev));
  }

  const panel = investigation && (
    <InvestigationPanel
      investigation={investigation}
      onNinChange={(v) => setInvestigation((prev) => (prev ? { ...prev, ninInput: v } : prev))}
      onCheckNin={checkNin}
      onFlag={flagDangerous}
      onClose={() => setInvestigation(null)}
    />
  );

  return (
    <div className="flex h-screen flex-col bg-bg-canvas">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-extrabold tracking-[0.12em] text-brand">OQRAN</span>
        <div className="flex items-center gap-2">
          {isLead && (
            <Link href="/gov/team" className="text-xs font-semibold text-brand">
              Manage my team
            </Link>
          )}
          <Badge tone="brand">Investigator</Badge>
          <Link
            href="/account"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface-sunken text-sm font-semibold text-text-primary"
          >
            E
          </Link>
        </div>
      </header>

      <div className="flex items-center gap-2 px-5 pb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address, zone, or incident type"
          className="flex-1"
        />
        <Button
          disabled={query.length < 3 || investigation?.status === "loading"}
          onClick={() => runInvestigate({ query })}
        >
          Investigate
        </Button>
      </div>

      <div className="relative flex-1">
        <SpatialMap
          incidents={incidents}
          filter={query}
          onSelect={(incident) => {
            setInvestigation(null);
            setSelected(incident);
          }}
          onMapClick={(coords) => runInvestigate(coords)}
          pendingPin={investigation?.pin ?? null}
        />

        <div className="pointer-events-none absolute inset-x-5 top-3 hidden md:flex md:justify-end">
          {selected && (
            <div className="pointer-events-auto w-80 rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-elevation-lg">
              <SelectedSummary incident={selected} onClose={() => setSelected(null)} />
            </div>
          )}
          {panel && (
            <div className="pointer-events-auto w-80 rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-elevation-lg">
              {panel}
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <Sheet open={!!selected} onClose={() => setSelected(null)}>
          {selected && <SelectedSummary incident={selected} onClose={() => setSelected(null)} />}
        </Sheet>
        <Sheet open={!!investigation} onClose={() => setInvestigation(null)}>
          {panel}
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

function InvestigationPanel({
  investigation,
  onNinChange,
  onCheckNin,
  onFlag,
  onClose,
}: {
  investigation: Investigation;
  onNinChange: (v: string) => void;
  onCheckNin: () => void;
  onFlag: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {investigation.status === "loading" && (
        <p className="text-sm font-semibold text-text-primary/60">Checking this location…</p>
      )}

      {investigation.status === "error" && (
        <>
          <p className="text-sm font-semibold text-risk-critical">{investigation.error}</p>
          <button onClick={onClose} className="self-start text-xs font-semibold text-brand">
            Close
          </button>
        </>
      )}

      {investigation.status === "ready" && investigation.address && (
        <>
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-bold leading-snug">{investigation.address.label}</span>
            <button onClick={onClose} className="shrink-0 text-xs font-semibold text-brand">
              Close
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="brand">{TIER_LABEL[investigation.address.confidenceTier] ?? investigation.address.confidenceTier}</Badge>
            <Badge tone={RISK_BADGE_TONE[investigation.address.severity.toLowerCase()]}>
              {investigation.address.severity[0] + investigation.address.severity.slice(1).toLowerCase()}
            </Badge>
          </div>
          <p className="text-2xs font-medium text-text-primary/50">
            Risk score {investigation.address.riskScore} · {investigation.address.source}
          </p>

          <div className="h-px bg-border-subtle" />

          <div className="flex flex-col gap-1.5">
            <SimulatedLabel detail="pending NIMC API access">NIN cross-reference</SimulatedLabel>
            <div className="flex gap-2">
              <Input
                value={investigation.ninInput}
                onChange={(e) => onNinChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="11-digit NIN"
                inputMode="numeric"
                className="flex-1"
              />
              <Button
                disabled={investigation.ninInput.length !== 11 || investigation.ninBusy}
                onClick={onCheckNin}
              >
                Check
              </Button>
            </div>
            {investigation.ninResult && (
              <p className={`text-xs font-bold ${investigation.ninResult.matched ? "text-risk-low" : "text-risk-elevated"}`}>
                {investigation.ninResult.matched
                  ? "Matched — NIN-linked to this address"
                  : "No match found"}{" "}
                <SimulatedTag detail="pending NIMC API access" />
              </p>
            )}
          </div>

          <div className="h-px bg-border-subtle" />

          {investigation.flagged ? (
            <p className="text-xs font-bold text-risk-critical">Flagged as a danger zone.</p>
          ) : (
            <Button
              variant="danger"
              fullWidth
              disabled={investigation.flagBusy}
              onClick={onFlag}
            >
              Flag as dangerous for civilians
            </Button>
          )}
        </>
      )}
    </div>
  );
}
