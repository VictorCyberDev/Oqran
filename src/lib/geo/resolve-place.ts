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
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GEOCODE_TIMEOUT_MS = 4000;

/**
 * Turns free text into coordinates. Tries OQRAN's own address records
 * first, then falls back to OpenStreetMap's geocoder for streets we hold
 * nothing on — "no record here" is a real answer and still needs a point
 * on the map, otherwise a search for an unknown street looks broken.
 *
 * Geocoding failures degrade to null rather than throwing: a caller then
 * behaves exactly as it did before this fallback existed.
 */
export async function resolvePlace(query: string): Promise<ResolvedPlace | null> {
  const known = await db.address.findFirst({ where: { label: { contains: query } } });
  if (known) {
    return {
      label: known.label,
      latitude: known.latitude,
      longitude: known.longitude,
      addressId: known.id,
      hasRecord: true,
    };
  }

  const geocoded = await geocode(query);
  if (!geocoded) return null;

  return { ...geocoded, addressId: null, hasRecord: false };
}

async function geocode(
  query: string
): Promise<{ label: string; latitude: number; longitude: number } | null> {
  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    // OQRAN is Nigeria-only, so scoping the search keeps a street name
    // from resolving to a same-named street on another continent.
    url.searchParams.set("countrycodes", "ng");

    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires identifying the application.
        "User-Agent": "OQRAN/1.0 (spatial risk intelligence; contact via deployment owner)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const results = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = results?.[0];
    if (!first?.lat || !first?.lon) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { label: first.display_name ?? query, latitude, longitude };
  } catch (err) {
    console.error("[geocode] lookup failed:", err);
    return null;
  }
}
