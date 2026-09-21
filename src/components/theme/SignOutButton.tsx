"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { purgeOfflineData } from "@/lib/offline/sw";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      fullWidth
      onClick={async () => {
        await fetch("/api/auth/sign-out", { method: "POST" });
        // Shared devices: queued writes and cached assets belong to the
        // session that made them, so they leave with it.
        await purgeOfflineData();
        router.push("/");
        router.refresh();
      }}
    >
      Sign Out
    </Button>
  );
}
