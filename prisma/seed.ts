import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaMariaDb(url) });

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

  await db.address.upsert({
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

  await db.organization.upsert({
    where: { inviteCode: "OQ-BANK-DEMO" },
    create: {
      name: "Demo Commercial Bank",
      type: "BANK",
      inviteCode: "OQ-BANK-DEMO",
      verificationStatus: "VERIFIED",
    },
    update: {},
  });

  await db.organization.upsert({
    where: { inviteCode: "OQ-GOV-DEMO" },
    create: {
      name: "Demo State Investigations Bureau",
      type: "GOVERNMENT",
      inviteCode: "OQ-GOV-DEMO",
      verificationStatus: "VERIFIED",
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
