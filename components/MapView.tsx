"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { Place, RouteGeometry, RouteResult } from "@/lib/types";

type Props = {
  source: Place | null;
  destination: Place | null;
  route: RouteResult | null;
};

function mapStyle(): string | maplibregl.StyleSpecification {
  if (process.env.NEXT_PUBLIC_MAP_STYLE_URL) return process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (process.env.NEXT_PUBLIC_MAPTILER_API_KEY) {
    const key = encodeURIComponent(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);
    return {
      version: 8,
      sources: {
        maptiler: {
          type: "raster",
          url: `https://api.maptiler.com/maps/streets-v4/256/tiles.json?key=${key}`,
          tileSize: 256,
        },
      },
      layers: [{ id: "maptiler-streets", type: "raster", source: "maptiler" }],
    };
  }
  return "https://tiles.openfreemap.org/styles/liberty";
}

function markerElement(kind: "source" | "destination") {
  const element = document.createElement("div");
  element.className = `map-marker map-marker-${kind}`;
  const label = document.createElement("span");
  label.textContent = kind === "source" ? "A" : "B";
  element.append(label);
  return element;
}

function projectedPoints(map: MapLibreMap, geometry?: RouteGeometry) {
  if (!geometry) return "";
  return geometry.coordinates
    .map(([lng, lat]) => {
      const point = map.project([lng, lat]);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
}

export function MapView({ source, destination, route }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const outboundShadowRef = useRef<SVGPolylineElement>(null);
  const outboundRef = useRef<SVGPolylineElement>(null);
  const returnShadowRef = useRef<SVGPolylineElement>(null);
  const returnRef = useRef<SVGPolylineElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [55, 24],
      zoom: 1.75,
      minZoom: 1,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const points: { place: Place; kind: "source" | "destination" }[] = [];
    if (source) points.push({ place: source, kind: "source" });
    if (destination) points.push({ place: destination, kind: "destination" });
    for (const point of points) {
      markersRef.current.push(
        new maplibregl.Marker({ element: markerElement(point.kind), anchor: "bottom" })
          .setLngLat([point.place.lng, point.place.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setText(point.place.name))
          .addTo(map),
      );
    }

    const drawOverlay = () => {
      const outbound = projectedPoints(map, route?.outboundGeometry);
      const returning = projectedPoints(map, route?.returnGeometry);
      outboundShadowRef.current?.setAttribute("points", outbound);
      outboundRef.current?.setAttribute("points", outbound);
      returnShadowRef.current?.setAttribute("points", returning);
      returnRef.current?.setAttribute("points", returning);
    };
    map.on("move", drawOverlay);
    map.on("resize", drawOverlay);
    drawOverlay();

    const coordinates = route?.geometry.coordinates ?? points.map((point) => [point.place.lng, point.place.lat]);
    if (coordinates.length > 1) {
      const isCompact = map.getContainer().clientWidth < 800;
      const bounds = coordinates.reduce(
        (current, coordinate) => current.extend(coordinate as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]),
      );
      map.fitBounds(bounds, {
        padding: isCompact
          ? { top: 90, bottom: route ? 280 : 90, left: 35, right: 35 }
          : { top: 150, bottom: 90, left: 440, right: route ? 350 : 80 },
        maxZoom: 9,
        duration: 1000,
      });
    } else if (coordinates.length === 1) {
      map.flyTo({ center: coordinates[0] as [number, number], zoom: 8 });
    }

    return () => {
      map.off("move", drawOverlay);
      map.off("resize", drawOverlay);
    };
  }, [source, destination, route]);

  return (
    <div className="map" aria-label="Route map">
      <div ref={containerRef} className="map-canvas" />
      <svg className="route-overlay" aria-hidden="true">
        <polyline ref={outboundShadowRef} className="route-svg-shadow" />
        <polyline ref={returnShadowRef} className="route-svg-shadow" />
        <polyline ref={outboundRef} className="route-svg-outbound" />
        <polyline ref={returnRef} className="route-svg-outbound" />
      </svg>
    </div>
  );
}
