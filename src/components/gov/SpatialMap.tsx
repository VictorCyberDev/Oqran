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
 * OpenFreeMap's "Liberty" style — a free, no-API-key OSM-Bright-style vector
 * style with real building footprints, road names, and POIs, not just an
 * abstract shape layer. Swap via NEXT_PUBLIC_MAP_STYLE_URL for a different
 * provider if needed. Styled toward the dark investigator palette with a
 * CSS filter on the canvas, same as the raster style this replaces.
 */
const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Fallback if the vector style fails to load for any reason (e.g. the
 * provider is unreachable) — degrades to plain OSM raster tiles rather than
 * leaving the map blank. */
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
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pendingMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const usedFallback = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || VECTOR_STYLE_URL,
      center: [8.6753, 9.082], // Nigeria centroid
      zoom: 5.2,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setReady(true));
    map.on("error", () => {
      if (usedFallback.current) return;
      usedFallback.current = true;
      map.setStyle(FALLBACK_RASTER_STYLE);
    });
    mapRef.current = map;
    return () => {
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
      el.style.background = "var(--color-brand)";
      el.style.border = "2px solid var(--color-map-surface)";
      pendingMarkerRef.current = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([pendingPin.longitude, pendingPin.latitude])
        .addTo(map);
      map.flyTo({ center: [pendingPin.longitude, pendingPin.latitude], zoom: 15 });
    }
  }, [pendingPin, ready]);

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
    <div ref={containerRef} className="gov-spatial-map h-full w-full">
      {/* Scoped to the WebGL canvas only — filtering the container would
          also invert the severity-colored marker DOM elements above it. */}
      <style>{`
        .gov-spatial-map .maplibregl-canvas {
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
