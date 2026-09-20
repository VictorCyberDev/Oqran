import { cn } from "@/lib/cn";

/**
 * The single disclosure treatment for every simulated feature in OQRAN.
 * Matches the NIN cross-reference label the Government map panel already
 * used, so "Simulated" reads identically wherever it appears rather than
 * being reworded per screen.
 *
 * `detail` says what the real thing is waiting on — e.g. "pending NIMC
 * API access" — so the disclosure explains itself instead of just
 * asserting the word.
 */
export function SimulatedTag({
  detail,
  className,
}: {
  detail: string;
  className?: string;
}) {
  return (
    <span className={cn("font-medium text-text-primary/50", className)}>
      (Simulated — {detail})
    </span>
  );
}

/** Section-header form: an uppercase caption with the disclosure built in. */
export function SimulatedLabel({
  children,
  detail,
  className,
}: {
  children: React.ReactNode;
  detail: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-2xs font-semibold uppercase tracking-wide text-text-primary/45",
        className
      )}
    >
      {children} — Simulated, {detail}
    </span>
  );
}

/** Compact chip for card corners and list rows, where a full sentence
 * would crowd the layout. Always pair with a fuller disclosure nearby. */
export function SimulatedChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-bg-surface-sunken px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-text-primary/50",
        className
      )}
    >
      Simulated
    </span>
  );
}
