"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, RISK_BADGE_TONE } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";

type Severity = "LOW" | "GUARDED" | "ELEVATED" | "CRITICAL";

interface StreetResult {
  place: { label: string; confidenceTier: string | null; addressId: string | null };
  risk: { severity: Severity; score: number; headline: string; advice: string; summary: string };
  confirmations: number;
  timeline: { id: string; type: string; severity: Severity; date: string }[];
}

export function StreetCheckPanel({ suggestions }: { suggestions: string[] }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbacks, setFallbacks] = useState<string[]>([]);
  const [result, setResult] = useState<StreetResult | null>(null);

  const [saveLabel, setSaveLabel] = useState("Home");
  const [saveState, setSaveState] = useState<"idle" | "busy" | "saved">("idle");

  async function check(payload: { query?: string; latitude?: number; longitude?: number }) {
    setBusy(true);
    setError(null);
    setFallbacks([]);
    setSaveState("idle");
    const res = await fetch("/api/citizen/street-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    setBusy(false);
    if (!res.ok) {
      setResult(null);
      setFallbacks(res.suggestions ?? []);
      return setError(res.error ?? "Couldn't check that place.");
    }
    setResult(res);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Location isn't available on this device.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => check({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {
        setBusy(false);
        setError("Couldn't get your location.");
      }
    );
  }

  async function savePlace() {
    if (!result?.place.addressId) return;
    setSaveState("busy");
    const res = await fetch("/api/citizen/saved-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId: result.place.addressId, label: saveLabel }),
    }).then((r) => r.json());
    setSaveState(res.ok ? "saved" : "idle");
  }

  const chips = fallbacks.length > 0 ? fallbacks : suggestions;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-md font-bold text-text-primary">Check this street</span>
          <span className="text-xs font-medium text-text-primary/50">
            Meeting a seller, viewing a flat, sending a delivery — see what&rsquo;s actually
            happened there first.
          </span>
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.length >= 2 && !busy) check({ query });
            }}
            placeholder="Street, area or landmark"
            className="flex-1"
          />
          <Button disabled={query.length < 2 || busy} onClick={() => check({ query })}>
            {busy ? "Checking…" : "Check"}
          </Button>
        </div>

        <button
          onClick={useMyLocation}
          disabled={busy}
          className="self-start text-sm font-semibold text-brand"
        >
          Use my current location
        </button>

        {error && <p className="text-xs font-semibold text-risk-elevated">{error}</p>}

        {chips.length > 0 && !result && (
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
              {fallbacks.length > 0 ? "Try one of these" : "Popular checks"}
            </span>
            <div className="flex flex-wrap gap-2">
              {chips.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    check({ query: s });
                  }}
                  className="rounded-full bg-bg-surface-sunken px-3 py-1.5 text-xs font-semibold text-text-primary/70"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {result && (
        <Card className="flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold leading-snug text-text-primary">
                {result.place.label}
              </p>
              {result.place.confidenceTier && (
                <p className="mt-0.5 text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
                  {result.place.confidenceTier.replace(/_/g, " ")}
                </p>
              )}
            </div>
            <Badge tone={RISK_BADGE_TONE[result.risk.severity.toLowerCase()]}>
              {result.risk.severity[0] + result.risk.severity.slice(1).toLowerCase()}
            </Badge>
          </div>

          <div>
            <p className="text-md font-bold text-text-primary">{result.risk.headline}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-text-primary/70">
              {result.risk.summary}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-text-primary/60">
              {result.risk.advice}
            </p>
          </div>

          {result.confirmations > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-bg-surface-sunken px-3.5 py-2.5">
              <StatusDot tone="elevated" />
              <span className="text-xs font-semibold text-text-primary/75">
                Confirmed by {result.confirmations} nearby{" "}
                {result.confirmations === 1 ? "report" : "reports"} in the last 30 days
              </span>
            </div>
          )}

          <div className="h-px bg-border-subtle" />

          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
              What&rsquo;s been reported
            </span>
            {result.timeline.length === 0 ? (
              <p className="text-sm text-text-primary/55">
                Nothing reported within 2km recently.
              </p>
            ) : (
              <div className="flex flex-col">
                {result.timeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-border-divider py-2 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <StatusDot tone={RISK_BADGE_TONE[item.severity.toLowerCase()]} />
                      <span className="text-sm font-semibold text-text-primary">{item.type}</span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-text-primary/50">
                      {new Date(item.date).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-2xs font-medium text-text-primary/40">
              Reports are shown by type and date only. Who reported them is never shown.
            </p>
          </div>

          {result.place.addressId && (
            <>
              <div className="h-px bg-border-subtle" />
              {saveState === "saved" ? (
                <p className="text-sm font-semibold text-risk-low">
                  Saved. You&rsquo;ll see this on your dashboard with its current risk level.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value.slice(0, 40))}
                    placeholder="Home, Work, Mum's place…"
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    disabled={!saveLabel.trim() || saveState === "busy"}
                    onClick={savePlace}
                  >
                    {saveState === "busy" ? "Saving…" : "Save place"}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
