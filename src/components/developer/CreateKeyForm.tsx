"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CreateKeyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  if (newKey) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-risk-guarded/30 bg-risk-guarded/10 p-4">
        <p className="text-xs font-bold text-risk-guarded">
          Copy this key now — it won&rsquo;t be shown again
        </p>
        <code className="break-all rounded-md bg-bg-surface p-2.5 text-xs font-mono text-text-primary">
          {newKey}
        </code>
        <Button
          variant="secondary"
          onClick={() => {
            setNewKey(null);
            setName("");
            router.refresh();
          }}
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" />
      <Button
        disabled={busy || name.length < 2}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/developer/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          const json = await res.json();
          setBusy(false);
          if (json.ok) setNewKey(json.key);
        }}
      >
        Create
      </Button>
    </div>
  );
}
