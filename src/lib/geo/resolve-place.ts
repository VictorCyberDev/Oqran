import "server-only";
import { db } from "@/lib/db";

export interface ResolvedPlace {
  label: string;
  latitude: number;
  longitude: number;
  /** The Address row this resolved to, when one already existed. */
  addressId: string | null;
  /** False when OQRAN held nothing for this place and the coordinates came
   * from geocoding — a valid, expected answer that callers should show
   * differently from a place with history behind it. */
  hasRecord: boolean;
  /** Where the coordinates came from, for honest error and status copy. */
  via: "oqran" | "nominatim" | "photon";
}

export type ResolveOutcome =
  | { ok: true; place: ResolvedPlace }
  /** Geocoders answered, but nothing matched this text. */
  | { ok: false; reason: "not_found" }
  /** Every geocoder errored or timed out — distinct from "no such place",
   * because the honest message to show differs. */
  | { ok: false; reason: "geocoder_unavailable" };

/** Nigeria's bounding box, used to bias both providers toward the only
 * country OQRAN covers so a common street name doesn't resolve abroad. */
const NG_WEST = 2.6769;
const NG_SOUTH = 4.2771;
const NG_EAST = 14.68;
const NG_NORTH = 13.8659;

const GEOCODE_TIMEOUT_MS = 5000;

/**
 * Nominatim's usage policy requires a User-Agent that identifies the
 * application with a real contact — requests without one are throttled or
 * refused, which is silent from the caller's side and looks exactly like
 * "address not found". Set GEOCODER_CONTACT to an email or URL you
 * monitor; it is read from the environment rather than hardcoded so a
 * personal address doesn't live in the repository.
 */
function userAgent(): string {
  const contact = process.env.GEOCODER_CONTACT?.trim();
  return contact
    ? `OQRAN/1.0 (spatial risk intelligence; contact: ${contact})`
    : "OQRAN/1.0 (spatial risk intelligence; contact not configured — set GEOCODER_CONTACT)";
}

/**
 * Turns free text into coordinates: OQRAN's own address records first,
 * then Nominatim, then Photon. "No record here" is a real answer and
 * still needs a point on the map, otherwise searching an unknown street
 * looks broken.
 */
export async function resolvePlace(query: string): Promise<ResolveOutcome> {
  const known = await db.address.findFirst({ where: { label: { contains: query } } });
  if (known) {
    return {
      ok: true,
      place: {
        label: known.label,
        latitude: known.latitude,
        longitude: known.longitude,
        addressId: known.id,
        hasRecord: true,
        via: "oqran",
      },
    };
  }

  const nominatim = await geocodeNominatim(query);
  if (nominatim.ok) return nominatim;

  const photon = await geocodePhoton(query);
  if (photon.ok) return photon;

  // Only report "not found" when at least one provider actually answered
  // and had nothing. If both failed to respond, say so instead — the user
  // shouldn't be told their address doesn't exist because of an outage.
  const anyProviderAnswered =
    nominatim.reason === "not_found" || photon.reason === "not_found";
  return { ok: false, reason: anyProviderAnswered ? "not_found" : "geocoder_unavailable" };
}

type ProviderResult =
  | { ok: true; place: ResolvedPlace }
  | { ok: false; reason: "not_found" | "geocoder_unavailable" };

async function geocodeNominatim(query: string): Promise<ProviderResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ng");
    // Preference, not a hard restriction — countrycodes already scopes it.
    url.searchParams.set("viewbox", `${NG_WEST},${NG_NORTH},${NG_EAST},${NG_SOUTH}`);

    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Referer: "https://oqran.app", "Accept-Language": "en" },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[geocode] nominatim responded ${res.status}`);
      return { ok: false, reason: "geocoder_unavailable" };
    }

    const rows = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = rows?.[0];
    if (!first?.lat || !first?.lon) return { ok: false, reason: "not_found" };

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, reason: "not_found" };
    }

    return {
      ok: true,
      place: {
        label: first.display_name ?? query,
        latitude,
        longitude,
        addressId: null,
        hasRecord: false,
        via: "nominatim",
      },
    };
  } catch (err) {
    console.error("[geocode] nominatim failed:", err);
    return { ok: false, reason: "geocoder_unavailable" };
  }
}

/** Photon (komoot) — open-source, OSM-backed, no API key. Second opinion
 * when Nominatim has nothing or is refusing requests. */
async function geocodePhoton(query: string): Promise<ProviderResult> {
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    url.searchParams.set("lang", "en");
    url.searchParams.set("bbox", `${NG_WEST},${NG_SOUTH},${NG_EAST},${NG_NORTH}`);

    const res = await fetch(url, {
      headers: { "User-Agent": userAgent() },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[geocode] photon responded ${res.status}`);
      return { ok: false, reason: "geocoder_unavailable" };
    }

    const body = (await res.json()) as {
      features?: {
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, string>;
      }[];
    };
    const first = body.features?.[0];
    const coords = first?.geometry?.coordinates;
    if (!coords || coords.length !== 2) return { ok: false, reason: "not_found" };

    const [longitude, latitude] = coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, reason: "not_found" };
    }

    const props = first?.properties ?? {};
    const label =
      [props.name, props.street, props.city, props.state].filter(Boolean).join(", ") || query;

    return {
      ok: true,
      place: { label, latitude, longitude, addressId: null, hasRecord: false, via: "photon" },
    };
  } catch (err) {
    console.error("[geocode] photon failed:", err);
    return { ok: false, reason: "geocoder_unavailable" };
  }
}

/** Client-facing copy for a failed resolution — distinguishes "we looked
 * and it isn't there" from "we couldn't look right now". */
export function resolveFailureMessage(reason: "not_found" | "geocoder_unavailable"): string {
  return reason === "not_found"
    ? "Location not found — try a more specific address, including the area or city."
    : "Address lookup is unavailable right now. Try again shortly, or pick the point on the map.";
}
