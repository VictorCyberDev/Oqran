"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { IconCircle } from "@/components/ui/IconCircle";
import { submitOrQueue } from "@/lib/offline/queue";

const CATEGORIES = [
  { id: "fraud", letter: "F", label: "Fraud" },
  { id: "theft", letter: "T", label: "Theft or Robbery" },
  { id: "cyber", letter: "C", label: "Cybercrime" },
  { id: "addr", letter: "S", label: "Suspicious Address" },
  { id: "pos", letter: "P", label: "PoS / Agent Issue" },
  { id: "other", letter: "O", label: "Other" },
];

export default function IncidentReportPage() {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ referenceCode?: string; queued?: boolean } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords(pos.coords),
      () => {},
      { timeout: 4000 }
    );
  }, []);

  async function submit() {
    if (!category) return;
    setBusy(true);
    setError(null);

    // submitOrQueue sends it now if it can and keeps it on the device if
    // it can't, with an idempotency key so a later replay can't file the
    // same report twice.
    const outcome = await submitOrQueue({
      url: "/api/citizen/incidents",
      body: {
        category,
        description: description || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
      label: `Incident report · ${CATEGORIES.find((c) => c.id === category)?.label ?? category}`,
    });

    setBusy(false);

    if (outcome.status === "queued") {
      setResult({ queued: true });
      return;
    }
    if (outcome.status === "error") {
      // A rejection the server will give again on every retry — showing it
      // is more honest than queueing a report that can never land.
      setError(outcome.error);
      return;
    }
    setResult({ referenceCode: String(outcome.data.referenceCode ?? "") });
  }

  if (result) {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <IconCircle tone={result.queued ? "guarded" : "low"}>
            {result.queued ? (
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2} />
              </svg>
            ) : (
              <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </IconCircle>
          <h1 className="text-3xl font-bold text-text-primary">
            {result.queued ? "Saved — will submit when back online" : "Report Submitted"}
          </h1>
          {result.referenceCode && (
            <p className="text-sm font-bold text-brand">Reference {result.referenceCode}</p>
          )}
          <p className="max-w-xs text-sm leading-relaxed text-text-primary/60">
            {result.queued
              ? "You're offline right now. This report is saved on your device and will send automatically once you're back online."
              : "Thanks — this helps keep your area safer. A case officer may follow up if you left contact details."}
          </p>
          <Button className="mt-2 px-9" onClick={() => router.push("/citizen")}>
            Done
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackHeader title="Report an Incident" onBack={() => router.push("/citizen")} />
      <p className="-mt-3 text-sm font-medium text-text-primary/55">Takes less than 30 seconds</p>

      <div className="grid grid-cols-3 gap-2.5">
        {CATEGORIES.map((c) => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border bg-bg-surface p-3.5 ${
                active ? "border-2 border-brand" : "border-border-subtle"
              }`}
            >
              <span
                className={`flex h-8.5 w-8.5 items-center justify-center rounded-md text-sm font-bold ${
                  active ? "bg-brand/10 text-brand" : "bg-bg-surface-sunken text-text-primary"
                }`}
              >
                {c.letter}
              </span>
              <span className="text-center text-xs font-semibold leading-tight text-text-primary">
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface p-3.5">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="flex-none text-brand">
          <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth={2} />
          <circle cx={12} cy={9} r={2.4} stroke="currentColor" strokeWidth={2} />
        </svg>
        <div className="flex-1">
          <p className="text-xs font-semibold text-text-primary">
            {coords ? "Using your current location" : "Location unavailable"}
          </p>
          <p className="text-xs font-medium text-text-primary/50">
            {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : "Report will be filed without coordinates"}
          </p>
        </div>
      </div>

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a few details (optional)"
      />

      {error && <p className="text-xs font-semibold text-risk-critical">{error}</p>}

      <Button fullWidth disabled={!category || busy} onClick={submit}>
        {busy ? "Submitting…" : "Submit Report"}
      </Button>
    </AppShell>
  );
}
