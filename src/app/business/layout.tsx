import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";

export default async function BusinessLayout({ children }: { children: ReactNode }) {
  await requireRole(["BUSINESS"]);
  return <>{children}</>;
}
