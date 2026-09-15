"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevokeKeyButton({ keyId }: { keyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/developer/keys/${keyId}/revoke`, { method: "POST" });
        router.refresh();
      }}
      className="text-xs font-semibold text-danger"
    >
      Revoke
    </button>
  );
}
