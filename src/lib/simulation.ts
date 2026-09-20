import "server-only";
import { createHash } from "crypto";

/**
 * Every simulated value in OQRAN is derived here, from a SHA-256 of its
 * inputs — never at random. Two consequences that matter:
 *
 *  - The same NIN and address always produce the same answer, so a demo
 *    can be re-run and a screenshot re-taken without the result changing
 *    underneath it, and a "no match" never silently becomes a "match" on
 *    a second click.
 *  - Nothing here invents personal data. Identities are pseudonymous
 *    references (NG-CIT-4F2A91), never names, so no screen can be
 *    mistaken for a real person's record.
 *
 * Anything returned from this module must be rendered with the shared
 * <SimulatedTag /> disclosure — see src/components/ui/SimulatedTag.tsx.
 */

function hashInt(...parts: string[]): number {
  const hash = createHash("sha256").update(parts.join(":")).digest("hex");
  return parseInt(hash.slice(0, 8), 16);
}

function hashRef(prefix: string, ...parts: string[]): string {
  const hash = createHash("sha256").update(parts.join(":")).digest("hex");
  return `${prefix}-${hash.slice(0, 6).toUpperCase()}`;
}

/** Deterministic mock NIN↔address cross-reference — there is no real NIMC
 * access. Used by the Government investigator's map panel. */
export function simulateNinAddressMatch(nin: string, addressId: string): boolean {
  return hashInt(nin, addressId) % 2 === 0;
}

export type NinIdentityStatus = "MATCHED" | "NO_MATCH" | "WATCHLIST";

export interface NinIdentityResult {
  status: NinIdentityStatus;
  /** Pseudonymous stand-in for an identity record — deliberately not a
   * name, so nothing here can read as a real person's data. */
  holderRef: string;
  /** Only set for WATCHLIST. Same reference shape the fraud-signal feed
   * already shows for public-watchlist matches. */
  watchlistRef?: string;
  /** How many other institutions have queried this NIN in the last week. */
  otherInstitutionQueries7d: number;
}

/**
 * Person-level NIN check for a bank compliance officer. Three outcomes,
 * weighted so a demo reaches all of them quickly: ~50% matched, ~30% no
 * match, ~20% on the regulatory watchlist (the severe state).
 */
export function simulateNinIdentity(nin: string): NinIdentityResult {
  const bucket = hashInt("identity", nin) % 10;
  const status: NinIdentityStatus =
    bucket <= 4 ? "MATCHED" : bucket <= 7 ? "NO_MATCH" : "WATCHLIST";

  return {
    status,
    holderRef: hashRef("NG-CIT", nin),
    watchlistRef: status === "WATCHLIST" ? hashRef("CBN-NIBSS-WL", nin) : undefined,
    otherInstitutionQueries7d: hashInt("queries", nin) % 5,
  };
}

export interface AddressActivityPattern {
  /** Verification attempts against this address in the last 24 hours. */
  verificationAttempts24h: number;
  /** Distinct institutions that looked it up in the last 7 days. */
  distinctInstitutions7d: number;
  hoursSinceLastQuery: number;
}

/**
 * The cross-institution pattern a single bank cannot see on its own —
 * the same address being checked repeatedly, or by several banks at once,
 * is exactly the signal OQRAN exists to surface.
 */
export function simulateAddressActivity(addressId: string): AddressActivityPattern {
  return {
    verificationAttempts24h: 1 + (hashInt("attempts", addressId) % 6),
    distinctInstitutions7d: 1 + (hashInt("institutions", addressId) % 4),
    hoursSinceLastQuery: hashInt("recency", addressId) % 24,
  };
}
