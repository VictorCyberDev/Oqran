import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";

export default async function BankLayout({ children }: { children: ReactNode }) {
  await requireRole(["BANK"]);
  return <>{children}</>;
}
