import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/roles";
import { canManageOrg } from "@/lib/auth/org-permissions";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

/** Fetches the current session's user and confirms they lead an
 * organization of one of the allowed roles. Returns null (never throws)
 * so API routes can respond with their own 403 — session role alone isn't
 * enough here, since orgRole and organizationId only live in the DB, not
 * the JWT. */
export async function getOrgLead(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.role)) return null;

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!canManageOrg(user, allowedRoles)) return null;

  return user;
}

/** Page guard: redirects a non-lead (or wrong-role) visitor to their real
 * home, exactly like requireRole but with the added orgRole===LEAD check
 * a plain role check can't express. */
export async function requireOrgLead(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const lead = await getOrgLead(allowedRoles);
  if (!lead) redirect(roleHomePath(session.role));

  return lead;
}
