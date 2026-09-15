import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "brand"
  | "low"
  | "guarded"
  | "elevated"
  | "critical"
  | "watchlist"
  | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: "bg-brand/10 text-brand",
  low: "bg-risk-low/[0.14] text-risk-low",
  guarded: "bg-risk-guarded/[0.14] text-risk-guarded",
  elevated: "bg-risk-elevated/[0.14] text-risk-elevated",
  critical: "bg-risk-critical/[0.14] text-risk-critical",
  watchlist: "bg-risk-watchlist text-risk-watchlist-ink",
  neutral: "bg-bg-surface-sunken text-text-primary/70",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}

export const RISK_BADGE_TONE: Record<string, BadgeTone> = {
  low: "low",
  guarded: "guarded",
  elevated: "elevated",
  critical: "critical",
};
