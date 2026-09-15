import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";

export default async function GovLayout({ children }: { children: ReactNode }) {
  await requireRole(["GOVERNMENT"]);
  return <>{children}</>;
}
