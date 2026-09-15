import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return <>{children}</>;
}
