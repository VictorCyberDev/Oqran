import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";

export default async function DeveloperLayout({ children }: { children: ReactNode }) {
  await requireRole(["DEVELOPER"]);
  return <>{children}</>;
}
