import "server-only";
import { db } from "@/lib/db";
import { GENESIS_HASH, computeEntryHash, verifyChain } from "@/lib/ledger/core";
import type { ChainVerificationResult } from "@/lib/ledger/core";

export { GENESIS_HASH, canonicalStringify, computeEntryHash, verifyChain } from "@/lib/ledger/core";
export type { LedgerRecord, ChainVerificationResult } from "@/lib/ledger/core";

/**
 * Appends a new entry to the chain. Reading the current head and inserting
 * the new row happen inside one transaction, which narrows — but on
 * MySQL/TiDB's default isolation does not fully eliminate — the race window
 * between two concurrent appends. Ledger writes in this app all originate
 * from a small set of server actions (incident creation, address
 * verification, fraud-signal resolution), so the realistic write concurrency
 * is low; a dedicated chain-head lock would close the gap entirely if that
 * changes.
 */
export async function appendLedgerEntry(payload: unknown) {
  return db.$transaction(async (tx) => {
    const latest = await tx.riskLedgerEntry.findFirst({ orderBy: { sequence: "desc" } });
    const prevHash = latest?.currentHash ?? GENESIS_HASH;
    const createdAt = new Date();
    const currentHash = computeEntryHash(payload, prevHash, createdAt);

    return tx.riskLedgerEntry.create({
      data: {
        payload: JSON.parse(JSON.stringify(payload)),
        prevHash,
        currentHash,
        createdAt,
      },
    });
  });
}

export async function verifyStoredChain(): Promise<ChainVerificationResult> {
  const entries = await db.riskLedgerEntry.findMany({ orderBy: { sequence: "asc" } });
  return verifyChain(
    entries.map((e) => ({
      payload: e.payload,
      prevHash: e.prevHash,
      currentHash: e.currentHash,
      createdAt: e.createdAt,
    }))
  );
}
