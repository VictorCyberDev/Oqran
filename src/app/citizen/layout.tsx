import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";

export default async function CitizenLayout({ children }: { children: ReactNode }) {
  await requireRole(["CITIZEN"]);
  return <>{children}</>;
}
