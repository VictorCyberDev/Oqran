"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function IconCircle({
  tone = "low",
  children,
  className,
}: {
  tone?: "low" | "guarded" | "critical";
  children: ReactNode;
  className?: string;
}) {
  const bg = {
    low: "bg-risk-low/[0.14] text-risk-low",
    guarded: "bg-risk-guarded/[0.14] text-risk-guarded",
    critical: "bg-risk-critical/[0.14] text-risk-critical",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      className={cn(
        "flex h-16 w-16 items-center justify-center rounded-full",
        bg,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
