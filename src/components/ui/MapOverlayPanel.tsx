import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Floating panel over a map surface — source-attribution banners, legends, controls. */
export function MapOverlayPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-white/10 bg-[#1D1F26]/92 px-3 py-2.5 text-[#EDEDEE] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
