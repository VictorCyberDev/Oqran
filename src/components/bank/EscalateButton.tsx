"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function EscalateButton({ signalId, resolved }: { signalId: string; resolved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (resolved) {
    return (
      <Button variant="secondary" fullWidth disabled>
        Escalated to CBN
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      fullWidth
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/bank/signals/${signalId}/escalate`, { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
    >
      Escalate to CBN Report
    </Button>
  );
}
