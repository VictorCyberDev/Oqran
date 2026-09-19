import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __oqranPrisma: PrismaClient | undefined;
}

/**
 * The mariadb driver's own pool defaults to connectionLimit: 10 with
 * minimumIdle equal to that — i.e. it holds 10 connections open at all
 * times. That's a per-process pool: on serverless, each concurrent warm
 * instance is a separate process with its own pool, so N instances mean
 * N × connectionLimit connections against TiDB at once, regardless of the
 * globalThis singleton below (which only dedupes within one process — it
 * can't dedupe across separate serverless containers). TiDB Cloud
 * Starter's connection ceiling is divided across however many instances
 * happen to be running, so each one needs to hold as few as possible.
 * Override via DATABASE_CONNECTION_LIMIT if you need to tune it.
 */
const DEFAULT_CONNECTION_LIMIT = 3;

function withConnectionLimit(url: string): string {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("connectionLimit")) {
    parsed.searchParams.set(
      "connectionLimit",
      process.env.DATABASE_CONNECTION_LIMIT ?? String(DEFAULT_CONNECTION_LIMIT)
    );
  }
  return parsed.toString();
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaMariaDb(withConnectionLimit(url));
  return new PrismaClient({ adapter });
}

export const db = globalThis.__oqranPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__oqranPrisma = db;
}
