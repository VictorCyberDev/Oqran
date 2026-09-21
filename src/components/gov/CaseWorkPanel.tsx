"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { submitOrQueue } from "@/lib/offline/queue";
import { CASE_STATUSES, CASE_STATUS_LABEL } from "@/lib/cases";
import type { CaseStatus } from "@/generated/prisma/enums";

/** Status control and note entry for a single case. Both hit the same
 * PATCH endpoint, so a status change and a note can be recorded in one go
 * when an investigator writes their reason for the change. */
export function CaseWorkPanel({
  caseId,
  currentStatus,
}: {
  caseId: string;
  currentStatus: CaseStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CaseStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  const statusChanged = status !== currentStatus;
  const canSubmit = (statusChanged || note.trim().length > 0) && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    setQueued(false);
    // Field investigators lose signal; the note stays on the device and
    // replays under one idempotency key so it can't be appended twice.
    const outcome = await submitOrQueue({
      url: `/api/gov/cases/${caseId}`,
      method: "PATCH",
      body: {
        status: statusChanged ? status : undefined,
        note: note.trim() || undefined,
      },
      label: statusChanged ? "Case status change" : "Case note",
    });
    setBusy(false);
    if (outcome.status === "error") return setError(outcome.error);
    if (outcome.status === "queued") {
      setQueued(true);
      setNote("");
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
          Status
        </span>
        <div className="flex flex-wrap gap-2">
          {CASE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                s === status
                  ? "bg-brand text-white"
                  : "bg-bg-surface-sunken text-text-primary/65 hover:text-text-primary"
              )}
            >
              {CASE_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-text-primary/45">
          Add a note
        </span>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you find, or why is the status changing?"
          maxLength={2000}
        />
      </div>

      {error && <p className="text-xs font-semibold text-risk-critical">{error}</p>}
      {queued && (
        <p className="text-xs font-semibold text-risk-guarded">
          Saved on this device — it will be recorded on the case once you&rsquo;re back online.
        </p>
      )}

      <Button fullWidth disabled={!canSubmit} onClick={submit}>
        {busy
          ? "Saving…"
          : statusChanged
            ? `Save — mark ${CASE_STATUS_LABEL[status].toLowerCase()}`
            : "Add note"}
      </Button>
    </div>
  );
}
