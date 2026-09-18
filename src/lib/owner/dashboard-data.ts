import "server-only";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import type { Role } from "@/generated/prisma/enums";

export const SIGNUP_ROLES: Role[] = ["CITIZEN", "BUSINESS", "BANK", "GOVERNMENT", "DEVELOPER"];
const WEEKS = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklySignups {
  weekStart: string;
  counts: Record<Role, number>;
}

/** Weekly signup counts by role, oldest to newest, for the last WEEKS weeks. */
export async function getSignupsByWeek(): Promise<WeeklySignups[]> {
  const now = Date.now();
  const since = daysAgo(WEEKS * 7);

  const users = await db.user.findMany({
    where: { createdAt: { gte: since }, role: { in: SIGNUP_ROLES } },
    select: { createdAt: true, role: true },
  });

  const buckets: WeeklySignups[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    buckets.push({
      weekStart: new Date(now - (i + 1) * WEEK_MS).toISOString(),
      counts: Object.fromEntries(SIGNUP_ROLES.map((r) => [r, 0])) as Record<Role, number>,
    });
  }

  for (const user of users) {
    const weeksAgo = Math.floor((now - user.createdAt.getTime()) / WEEK_MS);
    const idx = WEEKS - 1 - weeksAgo;
    if (idx >= 0 && idx < WEEKS) {
      buckets[idx].counts[user.role]++;
    }
  }

  return buckets;
}

export interface OrgSummary {
  id: string;
  name: string;
  type: string;
  userCount: number;
  createdAt: Date;
  verificationStatus: string;
  subscription: { planTier: string; status: string; amount: number; billingCycle: string } | null;
}

export async function getOrganizations(): Promise<OrgSummary[]> {
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true } }, subscription: true },
  });

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    type: o.type,
    userCount: o._count.users,
    createdAt: o.createdAt,
    verificationStatus: o.verificationStatus,
    subscription: o.subscription
      ? {
          planTier: o.subscription.planTier,
          status: o.subscription.status,
          amount: o.subscription.amount,
          billingCycle: o.subscription.billingCycle,
        }
      : null,
  }));
}

/** Business has no Organization concept yet (flagged in the Step 3 audit) —
 * counted here as individual accounts rather than fabricated organizations. */
export async function getBusinessAccountCount(): Promise<number> {
  return db.user.count({ where: { role: "BUSINESS" } });
}

export interface PlatformUsage {
  totalIncidents: number;
  totalVerifications: number;
  totalApiCalls: number;
}

export async function getPlatformUsage(): Promise<PlatformUsage> {
  const [totalIncidents, totalVerifications, totalApiCalls] = await Promise.all([
    db.incident.count(),
    db.activityLog.count({ where: { action: "ADDRESS_VERIFIED" } }),
    db.apiUsage.count(),
  ]);
  return { totalIncidents, totalVerifications, totalApiCalls };
}

export interface SystemHealth {
  signInsLast24h: number;
  failedOtpAttemptsLast24h: number;
}

/** Built entirely from data already recorded elsewhere (ActivityLog,
 * OtpCode.attemptCount) — there is no persisted request-level error/5xx
 * log yet, so this is the honest signal available today, not a fabricated
 * "error rate." See the dashboard's own notes for what a real one needs. */
export async function getSystemHealth(): Promise<SystemHealth> {
  const since = daysAgo(1);
  const [signInsLast24h, otpAgg] = await Promise.all([
    db.activityLog.count({ where: { action: "SIGN_IN", createdAt: { gte: since } } }),
    db.otpCode.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { attemptCount: true },
    }),
  ]);
  return {
    signInsLast24h,
    failedOtpAttemptsLast24h: otpAgg._sum.attemptCount ?? 0,
  };
}
