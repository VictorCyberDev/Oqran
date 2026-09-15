"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RemoveDeviceButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        await fetch("/api/account/devices/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        startTransition(() => router.refresh());
      }}
      className="self-start text-xs font-semibold text-danger"
    >
      Remove device
    </button>
  );
}
