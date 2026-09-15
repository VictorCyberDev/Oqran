"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(decision);
    await fetch(`/api/admin/approvals/${approvalId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button className="flex-1" disabled={!!busy} onClick={() => decide("approve")}>
        Approve
      </Button>
      <Button variant="secondary" className="flex-1" disabled={!!busy} onClick={() => decide("reject")}>
        Reject
      </Button>
    </div>
  );
}
