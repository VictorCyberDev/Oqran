"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveMemberButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/org/staff/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        router.refresh();
      }}
      className="text-xs font-semibold text-danger"
    >
      Remove
    </button>
  );
}
