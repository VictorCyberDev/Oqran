"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { FormError } from "@/app/(auth)/AuthShell";

const SUGGESTIONS = [
  "5 Bourdillon Road, Ikoyi, Lagos",
  "22 Awolowo Road, Ikoyi, Lagos",
  "Plot 107 Ademola Adetokunbo, Abuja",
];

interface AddressResult {
  label: string;
  confidenceTier: string;
  source: string;
  postcode: string | null;
  zoneType: string | null;
  severity: string;
}

const TIER_LABEL: Record<string, string> = {
  NIMC_CERTIFIED: "NIMC-Certified Verified",
  STATE_GIS: "State GIS-Verified",
  CROWD_REPORTED: "Crowd-Reported",
};

export default function AddressVerifyPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddressResult | null>(null);

  async function runVerify(coords?: { latitude: number; longitude: number }) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/citizen/address/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coords ? { ...coords, claim: true } : { query, claim: true }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) return setError(json.error ?? "Something went wrong.");
    setResult(json.address);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return setError("Location is not available on this device.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => runVerify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {
        setBusy(false);
        setError("Couldn't get your location.");
      }
    );
  }

  if (result) {
    return (
      <AppShell>
        <BackHeader title="Address Result" onBack={() => setResult(null)} />
        <Card className="flex flex-col gap-3.5">
          <div className="flex w-fit items-center gap-2 rounded-md bg-brand px-3 py-2 text-white">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-bold">{TIER_LABEL[result.confidenceTier]}</span>
          </div>
          <p className="text-lg font-bold leading-snug text-text-primary">{result.label}</p>
          <p className="text-xs font-semibold text-text-primary/50">{result.source}</p>
          <div className="h-px bg-border-subtle" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary/60">Risk level</span>
            <Badge tone={RISK_BADGE_TONE[result.severity.toLowerCase()]}>
              {result.severity[0] + result.severity.slice(1).toLowerCase()}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">Postcode</p>
              <p className="text-sm font-semibold text-text-primary">{result.postcode ?? "Pending"}</p>
            </div>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">Zone type</p>
              <p className="text-sm font-semibold text-text-primary">{result.zoneType ?? "Unclassified"}</p>
            </div>
          </div>
        </Card>
        <button
          className="text-center text-sm font-semibold text-brand"
          onClick={() => {
            setResult(null);
            setQuery("");
          }}
        >
          Search another address
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackHeader title="Verify an Address" onBack={() => router.push("/citizen")} />
      <FormError message={error} />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search address or drop a pin"
      />
      <button
        onClick={useCurrentLocation}
        className="text-left text-sm font-semibold text-brand"
        disabled={busy}
      >
        Use my current location
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/45">
        Suggestions
      </p>
      <div className="flex flex-col gap-2.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setQuery(s)}
            className="rounded-md border border-border-subtle bg-bg-surface px-4 py-3 text-left text-sm font-medium text-text-primary"
          >
            {s}
          </button>
        ))}
      </div>
      <Button fullWidth disabled={busy || query.length < 3} onClick={() => runVerify()}>
        Check Address
      </Button>
    </AppShell>
  );
}
