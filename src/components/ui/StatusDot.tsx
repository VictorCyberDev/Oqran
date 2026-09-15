import { cn } from "@/lib/cn";
import type { BadgeTone } from "./Badge";

const DOT_COLOR: Record<BadgeTone, string> = {
  brand: "bg-brand",
  low: "bg-risk-low",
  guarded: "bg-risk-guarded",
  elevated: "bg-risk-elevated",
  critical: "bg-risk-critical",
  watchlist: "bg-risk-watchlist",
  neutral: "bg-text-primary/40",
};

export function StatusDot({ tone, pulse }: { tone: BadgeTone; pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            DOT_COLOR[tone]
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", DOT_COLOR[tone])} />
    </span>
  );
}
