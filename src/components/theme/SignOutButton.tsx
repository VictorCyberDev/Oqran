"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      fullWidth
      onClick={async () => {
        await fetch("/api/auth/sign-out", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sign Out
    </Button>
  );
}
