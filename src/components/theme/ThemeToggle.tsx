"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { applyThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle({ initial }: { initial: ThemePreference }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(value: ThemePreference) {
    applyThemePreference(value);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex items-center gap-1 rounded-sm bg-bg-surface-sunken p-1"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={initial === opt.value}
          disabled={pending}
          onClick={() => choose(opt.value)}
          className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
            initial === opt.value
              ? "bg-bg-surface text-brand shadow-elevation-sm"
              : "text-text-primary/55 hover:text-text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
