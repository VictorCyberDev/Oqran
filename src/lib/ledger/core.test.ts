import { describe, expect, it } from "vitest";
import { GENESIS_HASH, canonicalStringify, computeEntryHash, verifyChain } from "./core";
import type { LedgerRecord } from "./core";

describe("canonicalStringify", () => {
  it("produces identical output regardless of key insertion order", () => {
    const a = { b: 2, a: 1, c: { y: 2, x: 1 } };
    const b = { a: 1, c: { x: 1, y: 2 }, b: 2 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("distinguishes genuinely different payloads", () => {
    expect(canonicalStringify({ a: 1 })).not.toBe(canonicalStringify({ a: 2 }));
  });
});

describe("computeEntryHash", () => {
  it("is deterministic for the same inputs", () => {
    const ts = "2026-01-01T00:00:00.000Z";
    const h1 = computeEntryHash({ x: 1 }, GENESIS_HASH, ts);
    const h2 = computeEntryHash({ x: 1 }, GENESIS_HASH, ts);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when the payload, prevHash, or timestamp changes", () => {
    const ts = "2026-01-01T00:00:00.000Z";
    const base = computeEntryHash({ x: 1 }, GENESIS_HASH, ts);
    expect(computeEntryHash({ x: 2 }, GENESIS_HASH, ts)).not.toBe(base);
    expect(computeEntryHash({ x: 1 }, "f".repeat(64), ts)).not.toBe(base);
    expect(computeEntryHash({ x: 1 }, GENESIS_HASH, "2026-01-01T00:00:00.001Z")).not.toBe(base);
  });
});

function buildChain(payloads: unknown[]): LedgerRecord[] {
  let prevHash = GENESIS_HASH;
  const baseTime = Date.parse("2026-01-01T00:00:00.000Z");
  return payloads.map((payload, i) => {
    const createdAt = new Date(baseTime + i * 1000).toISOString();
    const currentHash = computeEntryHash(payload, prevHash, createdAt);
    const record: LedgerRecord = { payload, prevHash, currentHash, createdAt };
    prevHash = currentHash;
    return record;
  });
}

describe("verifyChain", () => {
  it("accepts an untampered chain", () => {
    const chain = buildChain([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(verifyChain(chain)).toEqual({ valid: true, totalEntries: 3 });
  });

  it("accepts an empty chain", () => {
    expect(verifyChain([])).toEqual({ valid: true, totalEntries: 0 });
  });

  it("rejects a chain whose first entry does not start from the genesis hash", () => {
    const chain = buildChain([{ n: 1 }]);
    chain[0].prevHash = "1".repeat(64);
    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(0);
  });

  it("detects a tampered payload without a matching hash update", () => {
    const chain = buildChain([{ n: 1 }, { n: 2 }, { n: 3 }]);
    // Simulate an attacker editing row 1's payload after the fact.
    chain[1] = { ...chain[1], payload: { n: 999 } };
    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
    expect(result.reason).toMatch(/altered/);
  });

  it("detects a broken link between two entries", () => {
    const chain = buildChain([{ n: 1 }, { n: 2 }, { n: 3 }]);
    // Simulate deleting the middle row — the link from 0 -> 2 no longer holds.
    const spliced = [chain[0], chain[2]];
    const result = verifyChain(spliced);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
    expect(result.reason).toMatch(/prevHash/);
  });

  it("detects reordered entries", () => {
    const chain = buildChain([{ n: 1 }, { n: 2 }, { n: 3 }]);
    const reordered = [chain[0], chain[2], chain[1]];
    const result = verifyChain(reordered);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });
});
