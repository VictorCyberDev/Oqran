import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guard";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireRole(["PLATFORM_OWNER"]);
  return <>{children}</>;
}
