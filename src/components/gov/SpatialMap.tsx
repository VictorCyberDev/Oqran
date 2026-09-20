"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { RISK_SEVERITY_HEX, DANGER_FLAG_TYPE } from "@/lib/geo/severity-colors";

export interface MapIncident {
  id: string;
  type: string;
  severity: "LOW" | "GUARDED" | "ELEVATED" | "CRITICAL";
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  address: { label: string } | null;
}

/**
 * CARTO's Dark Matter — a free, no-API-key OSM vector style that is dark
 * by design, with building footprints, road names and POI labels.
 *
 * This replaces a light vector style pushed through an invert/hue-rotate
 * CSS filter. That trick was fine on the old minimal raster basemap, but
 * on a dense label-heavy style it inverted the label text and casing too,
 * producing clashing colours and unreadable type. A natively dark style
 * needs no filter at all, so the filter below now applies *only* to the
 * raster fallback. Override with NEXT_PUBLIC_MAP_STYLE_URL if needed.
 */
const DARK_VECTOR_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Fallback if the vector style fails to load for any reason (e.g. the
 * provider is unreachable) — degrades to plain OSM raster tiles rather than
 * leaving the map blank. This one still needs the dark filter. */
const FALLBACK_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function SpatialMap({
  incidents,
  filter,
  onSelect,
  onMapClick,
  pendingPin,
  pendingPinHasRecord = true,
}: {
  incidents: MapIncident[];
  filter: string;
  onSelect: (incident: MapIncident) => void;
  /** Fired when the investigator clicks/taps a bare point on the map, for
   * the "mark this location" flow. Optional — omit to disable map-click
   * marking (e.g. read-only contexts). */
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  /** The just-clicked or just-searched location, shown as a pin while its
   * investigation panel is open — not a persisted Incident, so it isn't
   * part of `incidents`. Passing new coordinates also flies the map there. */
  pendingPin?: { latitude: number; longitude: number } | null;
  /** False draws the pin hollow, marking a place OQRAN holds no record
   * for — visibly different from a pin over somewhere with history. */
  pendingPinHasRecord?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pendingMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  /** True once we've dropped to raster. Drives both the dark CSS filter
   * and the on-map notice, so which basemap is actually live is visible
   * rather than something you have to infer from how the map looks. */
  const [onFallbackBasemap, setOnFallbackBasemap] = useState(false);
  const usedFallback = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || DARK_VECTOR_STYLE_URL,
      center: [8.6753, 9.082], // Nigeria centroid
      zoom: 5.2,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    function fallBack(why: string) {
      if (usedFallback.current) return;
      usedFallback.current = true;
      console.warn(`[map] vector basemap unavailable (${why}) — using raster fallback`);
      setOnFallbackBasemap(true);
      map.setStyle(FALLBACK_RASTER_STYLE);
    }

    // A single failed tile or missing glyph also fires "error", so an
    // error alone is too eager a trigger — it would throw away a working
    // vector style over one hiccup. Only give up if the style genuinely
    // hasn't loaded in time.
    const timer = setTimeout(() => {
      if (!map.isStyleLoaded()) fallBack("style did not load within 6s");
    }, 6000);

    map.on("load", () => {
      clearTimeout(timer);
      setReady(true);
    });
    // setStyle() replaces the style after "load" may already have fired
    // (or instead of it, if the vector style never loaded at all), so the
    // marker pass needs a second trigger or the map comes back empty.
    map.on("styledata", () => setReady(true));

    mapRef.current = map;
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;
    const handler = (e: { lngLat: { lat: number; lng: number } }) => {
      onMapClick({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;

    if (pendingPin) {
      const el = document.createElement("div");
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50% 50% 50% 0";
      el.style.transform = "rotate(-45deg)";
      // Solid brand pin where OQRAN has a record; hollow where it doesn't,
      // so "nothing on file here" is legible at a glance on the map.
      el.style.background = pendingPinHasRecord ? "var(--color-brand)" : "transparent";
      el.style.border = pendingPinHasRecord
        ? "2px solid var(--color-map-surface)"
        : "2px dashed var(--color-brand)";
      pendingMarkerRef.current = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([pendingPin.longitude, pendingPin.latitude])
        .addTo(map);
      map.flyTo({ center: [pendingPin.longitude, pendingPin.latitude], zoom: 15 });
    }
  }, [pendingPin, pendingPinHasRecord, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visible = filter
      ? incidents.filter(
          (i) =>
            i.type.toLowerCase().includes(filter.toLowerCase()) ||
            i.address?.label.toLowerCase().includes(filter.toLowerCase())
        )
      : incidents;

    for (const incident of visible) {
      const isDangerFlag = incident.type === DANGER_FLAG_TYPE;
      const el = document.createElement("button");
      el.setAttribute("aria-label", incident.type);
      const size = isDangerFlag ? "24px" : "16px";
      el.style.width = size;
      el.style.height = size;
      el.style.borderRadius = "50%";
      el.style.border = isDangerFlag
        ? "3px solid white"
        : "2px solid var(--color-map-surface)";
      el.style.background = RISK_SEVERITY_HEX[incident.severity];
      el.style.boxShadow = `0 0 0 5px color-mix(in srgb, ${RISK_SEVERITY_HEX[incident.severity]} 25%, transparent)`;
      el.style.cursor = "pointer";
      if (isDangerFlag) el.style.animation = "oqran-danger-pulse 1.6s ease-in-out infinite";

      const marker = new Marker({ element: el })
        .setLngLat([incident.longitude, incident.latitude])
        .addTo(map);
      el.addEventListener("click", () => onSelect(incident));
      markersRef.current.push(marker);
    }
  }, [incidents, filter, ready, onSelect]);

  return (
    <div
      ref={containerRef}
      className={`gov-spatial-map h-full w-full${onFallbackBasemap ? " gov-spatial-map--raster" : ""}`}
    >
      {onFallbackBasemap && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-md bg-map-panel/92 px-2.5 py-1.5 text-2xs font-semibold text-map-text backdrop-blur-sm">
          Basemap: raster fallback — the detailed vector style didn&rsquo;t load
        </div>
      )}
      {/* The invert filter now applies only to the raster fallback. The
          primary style is dark natively, and inverting it would wreck the
          label colours — which is exactly what the previous version did. */}
      <style>{`
        .gov-spatial-map--raster .maplibregl-canvas {
          filter: invert(1) hue-rotate(180deg) saturate(0.6) brightness(0.9);
        }
        .gov-spatial-map .maplibregl-ctrl-attrib { display: none; }
        @keyframes oqran-danger-pulse {
          0%, 100% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-risk-critical) 35%, transparent); }
          50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--color-risk-critical) 15%, transparent); }
        }
      `}</style>
    </div>
  );
}
