import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export function RoleHeader({ roleLabel, initial }: { roleLabel: string; initial: string }) {
  return (
    <header className="flex items-center justify-between">
      <span className="text-sm font-extrabold tracking-[0.12em] text-brand">OQRAN</span>
      <div className="flex items-center gap-2">
        <Badge tone="brand">{roleLabel}</Badge>
        <Link
          href="/account"
          aria-label="Account"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface-sunken text-sm font-semibold text-text-primary"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
