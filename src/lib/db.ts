import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __oqranPrisma: PrismaClient | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

export const db = globalThis.__oqranPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__oqranPrisma = db;
}
