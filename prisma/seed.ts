import { randomBytes } from "crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

// This script sets isDemo: true and grants role/status directly — the only
// place either is ever set outside a live database edit. Never runnable
// against a production environment.
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run prisma/seed.ts with NODE_ENV=production.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaMariaDb(url) });

const DEMO_OTP_CODE = "000000";

function freshInviteCode(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function main() {
  const bourdillon = await db.address.upsert({
    where: { id: "seed-addr-bourdillon" },
    create: {
      id: "seed-addr-bourdillon",
      label: "5 Bourdillon Road, Ikoyi, Lagos",
      latitude: 6.4531,
      longitude: 3.4356,
      confidenceTier: "NIMC_CERTIFIED",
      source: "NIMC-certified identity infrastructure",
      postcode: "106104",
      zoneType: "Residential",
      severity: "LOW",
    },
    update: {},
  });

  const awolowo = await db.address.upsert({
    where: { id: "seed-addr-awolowo" },
    create: {
      id: "seed-addr-awolowo",
      label: "22 Awolowo Road, Ikoyi, Lagos",
      latitude: 6.4498,
      longitude: 3.4372,
      confidenceTier: "STATE_GIS",
      source: "Lagos State GIS (AGIS)",
      postcode: "106104",
      zoneType: "Mixed-use",
      severity: "GUARDED",
    },
    update: {},
  });

  const ademola = await db.address.upsert({
    where: { id: "seed-addr-ademola" },
    create: {
      id: "seed-addr-ademola",
      label: "Plot 107 Ademola Adetokunbo, Abuja",
      latitude: 9.0812,
      longitude: 7.4894,
      confidenceTier: "CROWD_REPORTED",
      source: "Community-reported — 6 confirmations",
      postcode: null,
      zoneType: "Mixed-use",
      severity: "ELEVATED",
    },
    update: {},
  });

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  await db.incident.upsert({
    where: { referenceCode: "OQ-SEED-0001" },
    create: {
      type: "Theft or Robbery",
      severity: "GUARDED",
      description: "Seed data for local risk-scoring demo",
      addressId: awolowo.id,
      latitude: awolowo.latitude,
      longitude: awolowo.longitude,
      status: "RESOLVED",
      referenceCode: "OQ-SEED-0001",
      createdAt: daysAgo(12),
    },
    update: {},
  });

  await db.incident.upsert({
    where: { referenceCode: "OQ-SEED-0002" },
    create: {
      type: "Suspicious Address",
      severity: "ELEVATED",
      description: "Seed data for local risk-scoring demo",
      addressId: bourdillon.id,
      latitude: bourdillon.latitude + 0.002,
      longitude: bourdillon.longitude + 0.001,
      status: "UNDER_REVIEW",
      referenceCode: "OQ-SEED-0002",
      createdAt: daysAgo(4),
    },
    update: {},
  });

  await db.incident.upsert({
    where: { referenceCode: "OQ-SEED-0003" },
    create: {
      type: "Fraud",
      severity: "CRITICAL",
      description: "Seed data for local risk-scoring demo",
      addressId: ademola.id,
      latitude: ademola.latitude,
      longitude: ademola.longitude,
      status: "SUBMITTED",
      referenceCode: "OQ-SEED-0003",
      createdAt: daysAgo(1),
    },
    update: {},
  });

  // Fresh (rotated on every seed run), unused invite codes for testing the
  // real self-service invite-code-plus-approval flow end to end.
  const bankInviteCode = freshInviteCode("OQ-BANK");
  const govInviteCode = freshInviteCode("OQ-GOV");

  const bankOrg = await db.organization.upsert({
    where: { id: "seed-org-bank" },
    create: {
      id: "seed-org-bank",
      name: "Demo Bank",
      type: "BANK",
      inviteCode: bankInviteCode,
      verificationStatus: "VERIFIED",
    },
    update: { inviteCode: bankInviteCode },
  });

  const govOrg = await db.organization.upsert({
    where: { id: "seed-org-gov" },
    create: {
      id: "seed-org-gov",
      name: "Demo Government Agency",
      type: "GOVERNMENT",
      inviteCode: govInviteCode,
      verificationStatus: "VERIFIED",
    },
    update: { inviteCode: govInviteCode },
  });

  await db.fraudSignal.upsert({
    where: { id: "seed-fraud-breached" },
    create: {
      id: "seed-fraud-breached",
      addressId: bourdillon.id,
      entityLabel: bourdillon.label,
      signalType: "Velocity Alert · 5 txns/hr",
      severity: "CRITICAL",
      source: "PUBLIC_WATCHLIST",
      watchlistRef: "CBN-NIBSS-WL-88213",
      flaggedAt: daysAgo(0),
      slaDeadline: new Date(now - 5 * 60 * 1000), // past the 30-min SLA
    },
    update: {},
  });

  await db.fraudSignal.upsert({
    where: { id: "seed-fraud-soon" },
    create: {
      id: "seed-fraud-soon",
      addressId: awolowo.id,
      entityLabel: awolowo.label,
      signalType: "Address Mismatch",
      severity: "GUARDED",
      source: "INTERNAL_REPORT",
      flaggedAt: daysAgo(0),
      slaDeadline: new Date(now + 8 * 60 * 1000), // inside the 30-min SLA
    },
    update: {},
  });

  await db.fraudSignal.upsert({
    where: { id: "seed-fraud-fresh" },
    create: {
      id: "seed-fraud-fresh",
      entityLabel: "9 Ademola Adetokunbo Cres, Wuse 2, Abuja",
      signalType: "PoS Geofence Mismatch",
      severity: "ELEVATED",
      source: "PUBLIC_WATCHLIST",
      watchlistRef: "CBN-NIBSS-WL-77410",
      flaggedAt: daysAgo(0),
      slaDeadline: new Date(now + 28 * 60 * 1000),
    },
    update: {},
  });

  // --- Demo accounts (isDemo: true) ------------------------------------
  // Sign in with the email below and the fixed code 000000 — never sent
  // as a real email, never hinted at in the sign-in UI.

  const bizOrg = await db.organization.upsert({
    where: { id: "seed-org-business" },
    create: {
      id: "seed-org-business",
      name: "Demo Business",
      type: "BUSINESS",
      inviteCode: freshInviteCode("OQ-BIZ"),
      verificationStatus: "VERIFIED",
    },
    update: {},
  });

  const govUser = await db.user.upsert({
    where: { email: "government@oqran-demo.test" },
    create: {
      role: "GOVERNMENT",
      email: "government@oqran-demo.test",
      authMethod: "EMAIL",
      status: "ACTIVE",
      isDemo: true,
      organizationId: govOrg.id,
      orgRole: "LEAD",
      displayName: "Demo Government Investigator (Lead)",
    },
    update: { isDemo: true, status: "ACTIVE", organizationId: govOrg.id, orgRole: "LEAD" },
  });

  const bankUser = await db.user.upsert({
    where: { email: "bank@oqran-demo.test" },
    create: {
      role: "BANK",
      email: "bank@oqran-demo.test",
      authMethod: "EMAIL",
      status: "ACTIVE",
      isDemo: true,
      organizationId: bankOrg.id,
      orgRole: "LEAD",
      displayName: "Demo Bank Compliance Officer (Lead)",
    },
    update: { isDemo: true, status: "ACTIVE", organizationId: bankOrg.id, orgRole: "LEAD" },
  });

  const businessUser = await db.user.upsert({
    where: { email: "business@oqran-demo.test" },
    create: {
      role: "BUSINESS",
      email: "business@oqran-demo.test",
      authMethod: "EMAIL",
      status: "ACTIVE",
      isDemo: true,
      organizationId: bizOrg.id,
      orgRole: "LEAD",
      displayName: "Demo Business Owner (Lead)",
    },
    update: { isDemo: true, status: "ACTIVE", organizationId: bizOrg.id, orgRole: "LEAD" },
  });

  // One MEMBER-level demo account per org, so the team/member lists aren't
  // empty on first login.
  const govMember = await db.user.upsert({
    where: { email: "government-member@oqran-demo.test" },
    create: {
      role: "GOVERNMENT",
      email: "government-member@oqran-demo.test",
      authMethod: "EMAIL",
      status: "ACTIVE",
      isDemo: true,
      organizationId: govOrg.id,
      orgRole: "MEMBER",
      displayName: "Demo Government Investigator (Member)",
    },
    update: { isDemo: true, status: "ACTIVE", organizationId: govOrg.id, orgRole: "MEMBER" },
  });

  const bankMember = await db.user.upsert({
    where: { email: "bank-member@oqran-demo.test" },
    create: {
      role: "BANK",
      email: "bank-member@oqran-demo.test",
      authMethod: "EMAIL",
      status: "ACTIVE",
      isDemo: true,
      organizationId: bankOrg.id,
      orgRole: "MEMBER",
      displayName: "Demo Bank Compliance Officer (Member)",
    },
    update: { isDemo: true, status: "ACTIVE", organizationId: bankOrg.id, orgRole: "MEMBER" },
  });

  const businessMember = await db.user.upsert({
    where: { email: "business-member@oqran-demo.test" },
    create: {
      role: "BUSINESS",
      email: "business-member@oqran-demo.test",
      authMethod: "EMAIL",
      status: "ACTIVE",
      isDemo: true,
      organizationId: bizOrg.id,
      orgRole: "MEMBER",
      displayName: "Demo Business Staff (Member)",
    },
    update: { isDemo: true, status: "ACTIVE", organizationId: bizOrg.id, orgRole: "MEMBER" },
  });

  await db.user.upsert({
    where: { email: "admin@oqran.ng" },
    create: {
      role: "ADMIN",
      email: "admin@oqran.ng",
      authMethod: "EMAIL",
      status: "ACTIVE",
      displayName: "Platform Admin",
    },
    update: {},
  });

  // The platform-owner account — PLATFORM_OWNER is never grantable through
  // signup, invite, or admin approval, only set directly here.
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL ?? "owner@oqran.ng";
  await db.user.upsert({
    where: { email: ownerEmail },
    create: {
      role: "PLATFORM_OWNER",
      email: ownerEmail,
      authMethod: "EMAIL",
      status: "ACTIVE",
      displayName: "Platform Owner",
    },
    update: { role: "PLATFORM_OWNER", status: "ACTIVE" },
  });

  // Placeholder subscriptions — no payment provider is wired yet.
  await db.subscription.upsert({
    where: { organizationId: bankOrg.id },
    create: {
      organizationId: bankOrg.id,
      planTier: "STANDARD",
      status: "ACTIVE",
      amount: 150000,
      billingCycle: "MONTHLY",
    },
    update: {},
  });

  await db.subscription.upsert({
    where: { organizationId: govOrg.id },
    create: {
      organizationId: govOrg.id,
      planTier: "ENTERPRISE",
      status: "TRIAL",
      amount: 0,
      billingCycle: "ANNUAL",
    },
    update: {},
  });

  // Sample zones so the business demo dashboard isn't empty.
  await db.zone.upsert({
    where: { id: "seed-zone-lekki" },
    create: {
      id: "seed-zone-lekki",
      businessId: businessUser.id,
      name: "Lekki Phase 1 — Zone B",
      type: "Delivery Zone",
      latitude: 6.4392,
      longitude: 3.4756,
      radiusKm: 2,
    },
    update: {},
  });

  await db.zone.upsert({
    where: { id: "seed-zone-apapa" },
    create: {
      id: "seed-zone-apapa",
      businessId: businessUser.id,
      name: "Apapa Wharf Corridor",
      type: "Logistics Corridor",
      latitude: 6.4432,
      longitude: 3.3592,
      radiusKm: 3,
    },
    update: {},
  });

  // Personal Activity/History rows for each demo account.
  await db.activityLog.createMany({
    data: [
      {
        userId: govUser.id,
        action: "SIGN_IN",
        description: "Signed in on trusted device (Demo)",
        createdAt: daysAgo(1),
      },
      {
        userId: govUser.id,
        action: "SPATIAL_GRID_VIEWED",
        description: "Reviewed national incident map",
        createdAt: daysAgo(0),
      },
      {
        userId: bankUser.id,
        action: "SIGN_IN",
        description: "Signed in on trusted device (Demo)",
        createdAt: daysAgo(2),
      },
      {
        userId: bankUser.id,
        action: "FRAUD_SIGNAL_EXPORTED",
        description: bourdillon.label,
        createdAt: daysAgo(0),
      },
      {
        userId: businessUser.id,
        action: "SIGN_IN",
        description: "Signed in on trusted device (Demo)",
        createdAt: daysAgo(3),
      },
      {
        userId: businessUser.id,
        action: "ZONE_VIEWED",
        description: "Lekki Phase 1 — Zone B",
        createdAt: daysAgo(0),
      },
      {
        userId: govMember.id,
        action: "SIGN_IN",
        description: "Signed in on trusted device (Demo)",
        createdAt: daysAgo(1),
      },
      {
        userId: bankMember.id,
        action: "SIGN_IN",
        description: "Signed in on trusted device (Demo)",
        createdAt: daysAgo(1),
      },
      {
        userId: businessMember.id,
        action: "SIGN_IN",
        description: "Signed in on trusted device (Demo)",
        createdAt: daysAgo(1),
      },
    ],
  });

  console.log("\nSeed complete.\n");
  console.log("Demo accounts (sign in with the fixed code below — never a real email):");
  console.log(`  Government — LEAD:   government@oqran-demo.test`);
  console.log(`  Government — MEMBER: government-member@oqran-demo.test`);
  console.log(`  Bank — LEAD:         bank@oqran-demo.test`);
  console.log(`  Bank — MEMBER:       bank-member@oqran-demo.test`);
  console.log(`  Business — LEAD:     business@oqran-demo.test`);
  console.log(`  Business — MEMBER:   business-member@oqran-demo.test`);
  console.log(`  Demo OTP code: ${DEMO_OTP_CODE}`);
  console.log(
    "\n  LEAD accounts can manage their team at /bank/team, /gov/team, or /account/team (Business)."
  );
  console.log("\nFresh invite codes (real approval flow — use a different, non-demo email):");
  console.log(`  Bank invite code:       ${bankInviteCode}`);
  console.log(`  Government invite code: ${govInviteCode}`);
  console.log(`\nPlatform owner account: ${ownerEmail} (real email — needs a real OTP, or the dev console-log fallback)`);
  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
