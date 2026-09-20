import type { OrgMemberRole, Role, UserStatus } from "@/generated/prisma/enums";

/** The subset of a user row this decision depends on. */
export interface OrgActor {
  role: Role;
  status: UserStatus;
  orgRole: OrgMemberRole;
  organizationId: string | null;
}

/**
 * Who may reach team management. Every condition has to hold: an active
 * account, one of the allowed top-level roles, membership of an
 * organization, and LEAD standing within it.
 *
 * Pure and separate from the session/redirect plumbing so the rule itself
 * is unit-tested — a MEMBER being able to reach this screen is an
 * access-control bug, not a cosmetic one, and it should fail a test
 * rather than only being caught by someone clicking around.
 */
export function canManageOrg(
  user: OrgActor | null | undefined,
  allowedRoles: Role[]
): user is OrgActor {
  if (!user) return false;
  if (user.status !== "ACTIVE") return false;
  if (!allowedRoles.includes(user.role)) return false;
  if (!user.organizationId) return false;
  return user.orgRole === "LEAD";
}
