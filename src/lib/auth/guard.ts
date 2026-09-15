import "server-only";
import { redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

/** Server-component guard: redirects to sign-in or the caller's real home
 * if the session is missing, the account is no longer active (a JWT stays
 * valid for its full lifetime even if an admin suspends the account
 * mid-session, so this re-checks the live DB row rather than trusting the
 * token alone), or the role isn't one of the allowed ones. Route handlers
 * must still check the session themselves — this only protects page
 * rendering. */
export async function requireRole(allowed: Role[]) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") {
    await clearSessionCookie();
    redirect("/sign-in");
  }

  if (!allowed.includes(session.role)) redirect(roleHomePath(session.role));
  return session;
}
