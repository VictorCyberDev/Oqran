"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { RISK_SEVERITY_HEX } from "@/lib/geo/severity-colors";

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
 * OpenStreetMap raster tiles, styled toward the dark investigator palette
 * with a CSS filter — real map data, not a placeholder. Swap MAP_STYLE for
 * a provider style (Mapbox/MapTiler/Stadia) via NEXT_PUBLIC_MAP_STYLE_URL
 * before relying on this for production tile-usage volume.
 */
const MAP_STYLE: StyleSpecification = {
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
}: {
  incidents: MapIncident[];
  filter: string;
  onSelect: (incident: MapIncident) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || MAP_STYLE,
      center: [8.6753, 9.082], // Nigeria centroid
      zoom: 5.2,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
      const el = document.createElement("button");
      el.setAttribute("aria-label", incident.type);
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid var(--color-map-surface)";
      el.style.background = RISK_SEVERITY_HEX[incident.severity];
      el.style.boxShadow = `0 0 0 5px color-mix(in srgb, ${RISK_SEVERITY_HEX[incident.severity]} 25%, transparent)`;
      el.style.cursor = "pointer";

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
      `}</style>
    </div>
  );
}
