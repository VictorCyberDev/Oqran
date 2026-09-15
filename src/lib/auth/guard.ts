import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/roles";
import type { Role } from "@/generated/prisma/enums";

/** Server-component guard: redirects to sign-in or the caller's real home
 * if the session is missing or not one of the allowed roles. Route
 * handlers must still check the session themselves — this only protects
 * page rendering. */
export async function requireRole(allowed: Role[]) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!allowed.includes(session.role)) redirect(roleHomePath(session.role));
  return session;
}
