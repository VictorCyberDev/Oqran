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

// ---------------------------------------------------------------------------
// Security & abuse monitoring
// ---------------------------------------------------------------------------

export interface RateLimitHotspot {
  /** e.g. "otp:resend" — the limiter, without the per-subject suffix. */
  category: string;
  /** The email, IP or user id the limiter was keyed on. */
  subject: string;
  hits: number;
  windows: number;
}

/**
 * Busiest rate-limit keys in the last 24 hours. Every limiter in the app
 * writes to RateLimitBucket, so repeated failed sign-ins, hammered invite
 * codes and scripted lookups all surface here without new instrumentation.
 *
 * Keys are "<category>:<subject>" where the subject is the last segment
 * (an email, IP or user id); splitting on the final colon keeps
 * multi-part categories like "otp:issue:<email>:SIGN_IN" readable.
 */
export async function getRateLimitHotspots(limit = 8): Promise<RateLimitHotspot[]> {
  const buckets = await db.rateLimitBucket.findMany({
    where: { windowStart: { gte: daysAgo(1) } },
    orderBy: { count: "desc" },
    take: 500,
  });

  const byKey = new Map<string, { hits: number; windows: number }>();
  for (const bucket of buckets) {
    const existing = byKey.get(bucket.key) ?? { hits: 0, windows: 0 };
    existing.hits += bucket.count;
    existing.windows += 1;
    byKey.set(bucket.key, existing);
  }

  return [...byKey.entries()]
    .map(([key, v]) => {
      const lastColon = key.lastIndexOf(":");
      return {
        category: lastColon > 0 ? key.slice(0, lastColon) : key,
        subject: lastColon > 0 ? key.slice(lastColon + 1) : "—",
        hits: v.hits,
        windows: v.windows,
      };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit);
}

export interface AnomalySignal {
  id: string;
  label: string;
  detail: string;
  triggered: boolean;
}

const HOUR_MS = 60 * 60 * 1000;
const BASELINE_DAYS = 7;
/** Below this, normal variation looks like a spike, so no flag is raised. */
const MIN_ABSOLUTE = 5;
/** How many times the hourly baseline counts as anomalous. */
const SPIKE_MULTIPLE = 3;

function spikeDetail(recent: number, baseline: number, noun: string): string {
  const rounded = Math.round(baseline * 10) / 10;
  return `${recent} in the last hour, against a ${rounded}/hour average over the last ${BASELINE_DAYS} days${
    recent === 0 ? "" : ""
  } — ${noun}`;
}

/**
 * Threshold flags computed from data already recorded, not invented
 * scores. Each compares the last hour against that metric's own hourly
 * average over the previous week, and only fires above a small absolute
 * floor so a quiet platform doesn't flag constantly.
 */
export async function getAnomalySignals(): Promise<AnomalySignal[]> {
  const now = Date.now();
  const hourAgo = new Date(now - HOUR_MS);
  const baselineStart = new Date(now - BASELINE_DAYS * 24 * HOUR_MS);
  const baselineHours = BASELINE_DAYS * 24;

  const [failedRecent, failedBaseline, signupsRecent, signupsBaseline] = await Promise.all([
    db.otpCode.aggregate({
      where: { purpose: "SIGN_IN", createdAt: { gte: hourAgo } },
      _sum: { attemptCount: true },
    }),
    db.otpCode.aggregate({
      where: { purpose: "SIGN_IN", createdAt: { gte: baselineStart, lt: hourAgo } },
      _sum: { attemptCount: true },
    }),
    db.user.count({ where: { createdAt: { gte: hourAgo } } }),
    db.user.count({ where: { createdAt: { gte: baselineStart, lt: hourAgo } } }),
  ]);

  const failed = failedRecent._sum.attemptCount ?? 0;
  const failedPerHour = (failedBaseline._sum.attemptCount ?? 0) / baselineHours;
  const signupPerHour = signupsBaseline / baselineHours;

  return [
    {
      id: "failed-signins",
      label: "Failed sign-in attempts",
      detail: spikeDetail(failed, failedPerHour, "incorrect OTP entries"),
      triggered: failed >= MIN_ABSOLUTE && failed > failedPerHour * SPIKE_MULTIPLE,
    },
    {
      id: "signup-spike",
      label: "New account signups",
      detail: spikeDetail(signupsRecent, signupPerHour, "accounts created"),
      triggered: signupsRecent >= MIN_ABSOLUTE && signupsRecent > signupPerHour * SPIKE_MULTIPLE,
    },
  ];
}

// ---------------------------------------------------------------------------
// Platform-wide fraud / SLA visibility
// ---------------------------------------------------------------------------

export interface OrgSlaRow {
  organization: string;
  resolved: number;
  breachedAtResolution: number;
  avgMinutesToResolve: number | null;
}

export interface FraudSlaOverview {
  openWithinSla: number;
  openPastSla: number;
  resolvedTotal: number;
  /** Signals with no user attached to attribute them to an organization —
   * mostly public-watchlist imports. Reported rather than hidden so the
   * per-org table is read in the right context. */
  unattributed: number;
  byOrganization: OrgSlaRow[];
}

/** Fraud-signal SLA across every bank at once — the view no single bank
 * can produce for itself, and the one that shows whether a particular
 * organization is systematically slow to act. */
export async function getFraudSlaOverview(): Promise<FraudSlaOverview> {
  const now = new Date();

  const signals = await db.fraudSignal.findMany({
    select: {
      slaDeadline: true,
      flaggedAt: true,
      resolvedAt: true,
      resolvedBy: { select: { organization: { select: { name: true } } } },
    },
  });

  const open = signals.filter((s) => !s.resolvedAt);
  const resolved = signals.filter((s) => s.resolvedAt);

  const perOrg = new Map<string, { resolved: number; breached: number; totalMinutes: number }>();
  let unattributed = 0;

  for (const signal of resolved) {
    const orgName = signal.resolvedBy?.organization?.name;
    if (!orgName) {
      unattributed++;
      continue;
    }
    const row = perOrg.get(orgName) ?? { resolved: 0, breached: 0, totalMinutes: 0 };
    row.resolved += 1;
    if (signal.resolvedAt! > signal.slaDeadline) row.breached += 1;
    row.totalMinutes += (signal.resolvedAt!.getTime() - signal.flaggedAt.getTime()) / 60000;
    perOrg.set(orgName, row);
  }

  return {
    openWithinSla: open.filter((s) => s.slaDeadline >= now).length,
    openPastSla: open.filter((s) => s.slaDeadline < now).length,
    resolvedTotal: resolved.length,
    unattributed,
    byOrganization: [...perOrg.entries()]
      .map(([organization, v]) => ({
        organization,
        resolved: v.resolved,
        breachedAtResolution: v.breached,
        avgMinutesToResolve: v.resolved ? Math.round(v.totalMinutes / v.resolved) : null,
      }))
      .sort((a, b) => b.breachedAtResolution - a.breachedAtResolution),
  };
}

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

export interface ConfidenceTierBreakdown {
  total: number;
  tiers: { tier: string; count: number; share: number }[];
}

/** How trustworthy the underlying address data is, platform-wide — the
 * share of addresses established by each method. */
export async function getConfidenceTierBreakdown(): Promise<ConfidenceTierBreakdown> {
  const grouped = await db.address.groupBy({
    by: ["confidenceTier"],
    _count: { _all: true },
  });

  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const order = ["NIMC_CERTIFIED", "STATE_GIS", "CROWD_REPORTED"];

  return {
    total,
    tiers: order.map((tier) => {
      const count = grouped.find((g) => g.confidenceTier === tier)?._count._all ?? 0;
      return { tier, count, share: total ? count / total : 0 };
    }),
  };
}

// ---------------------------------------------------------------------------
// National map
// ---------------------------------------------------------------------------

export interface NationalMapIncident {
  id: string;
  type: string;
  severity: "LOW" | "GUARDED" | "ELEVATED" | "CRITICAL";
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  address: { label: string } | null;
}

/** Every geolocated incident on the platform, for the owner's national
 * density view. Same shape the Government map already consumes. */
export async function getNationalIncidents(): Promise<NationalMapIncident[]> {
  const incidents = await db.incident.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      type: true,
      severity: true,
      latitude: true,
      longitude: true,
      status: true,
      createdAt: true,
      address: { select: { label: true } },
    },
  });

  return incidents.map((i) => ({
    id: i.id,
    type: i.type,
    severity: i.severity,
    latitude: i.latitude!,
    longitude: i.longitude!,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
    address: i.address,
  }));
}
