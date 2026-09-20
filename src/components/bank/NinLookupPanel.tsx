"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SimulatedTag, SimulatedLabel } from "@/components/ui/SimulatedTag";
import { EscalateToGovButton } from "@/components/bank/EscalateToGovButton";

type NinIdentityStatus = "MATCHED" | "NO_MATCH" | "WATCHLIST";

interface Identity {
  status: NinIdentityStatus;
  holderRef: string;
  watchlistRef?: string;
  otherInstitutionQueries7d: number;
}

const STATUS_COPY: Record<NinIdentityStatus, { label: string; tone: "low" | "neutral" | "watchlist"; blurb: string }> = {
  MATCHED: {
    label: "Matched",
    tone: "low",
    blurb: "This NIN resolves to a verified identity record.",
  },
  NO_MATCH: {
    label: "No match",
    tone: "neutral",
    blurb: "No identity record resolves to this NIN. Treat supporting documents with caution.",
  },
  WATCHLIST: {
    label: "On regulatory watchlist",
    tone: "watchlist",
    blurb: "This identity appears on the CBN/NIBSS regulatory watchlist. Escalation is recommended.",
  },
};

export function NinLookupPanel() {
  const [nin, setNin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ identity: Identity; nin: string } | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/bank/nin-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nin }),
    }).then((r) => r.json());
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Lookup failed.");
    setResult({ identity: res.identity, nin });
  }

  const copy = result ? STATUS_COPY[result.identity.status] : null;

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <span className="text-md font-bold text-text-primary">Identity cross-reference</span>
        <SimulatedLabel detail="pending NIMC API access">NIN check for a person</SimulatedLabel>
      </div>

      <div className="flex gap-2">
        <Input
          value={nin}
          onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="11-digit NIN"
          inputMode="numeric"
          className="flex-1"
        />
        <Button disabled={nin.length !== 11 || busy} onClick={run}>
          {busy ? "Checking…" : "Check"}
        </Button>
      </div>

      {error && <p className="text-xs font-semibold text-risk-critical">{error}</p>}

      {result && copy && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface-sunken p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={copy.tone}>{copy.label}</Badge>
            <span className="font-mono text-xs text-text-primary/60">{result.identity.holderRef}</span>
            {result.identity.watchlistRef && (
              <Badge tone="critical">{result.identity.watchlistRef}</Badge>
            )}
          </div>

          <p className="text-xs font-medium leading-relaxed text-text-primary/65">
            {copy.blurb} <SimulatedTag detail="pending NIMC API access" />
          </p>

          <div className="h-px bg-border-subtle" />

          <p className="text-xs font-medium text-text-primary/65">
            Queried by{" "}
            <span className="font-bold text-text-primary">
              {result.identity.otherInstitutionQueries7d}
            </span>{" "}
            other {result.identity.otherInstitutionQueries7d === 1 ? "institution" : "institutions"} in
            the last 7 days{" "}
            <SimulatedTag detail="pending inter-bank data-sharing agreements" />
          </p>

          <EscalateToGovButton
            target={{ kind: "nin", nin: result.nin }}
            label={
              result.identity.status === "WATCHLIST"
                ? "Escalate watchlist hit to Government"
                : "Escalate to Government"
            }
          />
        </div>
      )}
    </Card>
  );
}
