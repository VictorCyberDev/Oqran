"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/app/(auth)/AuthShell";

export function AddZoneForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
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

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-surface p-4">
      <FormError message={error} />
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name" />
      <Input
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="Type (e.g. Delivery Zone, Logistics Corridor)"
      />
      <button
        type="button"
        className="text-left text-xs font-semibold text-brand"
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => setError("Couldn't get your location.")
          )
        }
      >
        {coords ? `Using ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}` : "Use current location"}
      </button>
      <Button
        fullWidth
        disabled={busy || !name || !type || !coords}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch("/api/business/zones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type, ...coords }),
          });
          const json = await res.json();
          setBusy(false);
          if (!json.ok) return setError(json.error ?? "Something went wrong.");
          setOpen(false);
          setName("");
          setType("");
          setCoords(null);
          router.refresh();
        }}
      >
        Save zone
      </Button>
    </div>
  );
}
