import { createHash } from "crypto";

export const GENESIS_HASH = "0".repeat(64);

export interface LedgerRecord {
  payload: unknown;
  prevHash: string;
  currentHash: string;
  createdAt: Date | string;
}

/**
 * Deterministic JSON serialization (recursively sorted object keys) so the
 * same logical payload always hashes the same way regardless of the key
 * insertion order it happened to be constructed with.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const body = entries
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalStringify(val)}`)
    .join(",");
  return `{${body}}`;
}

function timestampOf(createdAt: Date | string): string {
  return typeof createdAt === "string" ? createdAt : createdAt.toISOString();
}

export function computeEntryHash(
  payload: unknown,
  prevHash: string,
  createdAt: Date | string
): string {
  return createHash("sha256")
    .update(`${prevHash}|${timestampOf(createdAt)}|${canonicalStringify(payload)}`)
    .digest("hex");
}

export interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenAtIndex?: number;
  reason?: string;
}

/**
 * Pure, I/O-free verification of a chain given in sequence order — the core
 * integrity check, kept independent of the database so it is unit-testable
 * in isolation.
 */
export function verifyChain(entries: LedgerRecord[]): ChainVerificationResult {
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenAtIndex: i,
        reason: "prevHash does not match the preceding entry's hash",
      };
    }

    const recomputed = computeEntryHash(entry.payload, entry.prevHash, entry.createdAt);
    if (recomputed !== entry.currentHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenAtIndex: i,
        reason: "stored hash does not match the recomputed hash — payload was altered",
      };
    }

    expectedPrev = entry.currentHash;
  }

  return { valid: true, totalEntries: entries.length };
}
