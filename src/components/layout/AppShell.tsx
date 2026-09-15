import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <div className={cn("mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5", className)}>
        {children}
      </div>
    </div>
  );
}
