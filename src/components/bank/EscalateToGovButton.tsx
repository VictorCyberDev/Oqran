"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export type EscalationTarget =
  | { kind: "signal"; signalId: string }
  | { kind: "address"; addressId: string }
  | { kind: "nin"; nin: string };

/**
 * Raises a real Case on the Government dashboard. The confirmation
 * deliberately names the reference code and says an investigator can see
 * it — the whole point is that this is a record handed to another
 * institution, not a local acknowledgement.
 */
export function EscalateToGovButton({
  target,
  label = "Escalate to Government",
}: {
  target: EscalationTarget;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raised, setRaised] = useState<{ referenceCode: string } | null>(null);

  if (raised) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-surface-sunken p-3.5">
        <p className="text-sm font-bold text-text-primary">
          Case {raised.referenceCode} raised
        </p>
        <p className="mt-0.5 text-xs font-medium text-text-primary/55">
          Now visible to Government investigators, who can annotate and change its status.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-bg-surface-sunken p-3.5">
      <span className="text-xs font-semibold text-text-primary">
        Note for the investigator <span className="font-medium text-text-primary/45">(optional)</span>
      </span>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What should Government know about this?"
        maxLength={2000}
      />
      {error && <p className="text-xs font-semibold text-risk-critical">{error}</p>}
      <div className="flex gap-2">
        <Button
          fullWidth
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch("/api/bank/escalate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...target, note: note || undefined }),
            }).then((r) => r.json());
            setBusy(false);
            if (!res.ok) return setError(res.error ?? "Could not raise the case.");
            setRaised(res.case);
          }}
        >
          {busy ? "Raising…" : "Raise case"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
