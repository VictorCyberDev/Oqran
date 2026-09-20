"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FormError } from "@/app/(auth)/AuthShell";

const ZONE_TYPES = ["Delivery Zone", "Logistics Corridor", "Warehouse", "Retail Site"];

export function AddZoneForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(ZONE_TYPES[0]);
  const [mode, setMode] = useState<"address" | "location">("address");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-border-default px-4 py-3.5 text-center text-sm font-semibold text-brand"
      >
        + Add a zone to watch
      </button>
    );
  }

  const locatable = mode === "address" ? address.trim().length >= 3 : coords !== null;

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/business/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        ...(mode === "address" ? { address } : coords),
      }),
    }).then((r) => r.json());
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    setOpen(false);
    setName("");
    setAddress("");
    setCoords(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-surface p-4">
      <FormError message={error} />

      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name" />

      <div className="flex flex-col gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
          Type
        </span>
        <div className="flex flex-wrap gap-2">
          {ZONE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={
                t === type
                  ? "rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full bg-bg-surface-sunken px-3 py-1.5 text-xs font-semibold text-text-primary/65"
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <SegmentedControl
        options={[
          { value: "address", label: "By address" },
          { value: "location", label: "Use my location" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === "address" ? (
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street or area, e.g. Awolowo Road, Ikoyi"
        />
      ) : (
        <button
          type="button"
          className="text-left text-sm font-semibold text-brand"
          onClick={() => {
            if (!navigator.geolocation) return setError("Location isn't available on this device.");
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => setError("Couldn't get your location — add the zone by address instead.")
            );
          }}
        >
          {coords
            ? `Using ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`
            : "Get my current location"}
        </button>
      )}

      <div className="flex gap-2">
        <Button fullWidth disabled={busy || name.length < 2 || !locatable} onClick={save}>
          {busy ? "Saving…" : "Save zone"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
