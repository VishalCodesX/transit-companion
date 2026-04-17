/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Spinner } from "./Spinner";
import { loadGoogleMaps, DARK_MAP_STYLE } from "@/services/mapsLoader";
import { distanceMeters } from "@/utils/mapUtils";
import type { MapBus } from "./MapView";

interface Props {
  buses: MapBus[];
  selectedBusId?: string | null;
  myStop?: { lat: number; lng: number } | null;
  /** Optional polyline path (e.g. trip history) */
  polyline?: { lat: number; lng: number }[];
  onBusClick?: (bus: MapBus) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  /** Disable my-stop drag (admin views) */
  stopDraggable?: boolean;
}

const STATUS_COLOR: Record<MapBus["status"], string> = {
  active: "#22C55E",
  idle: "#F59E0B",
  offline: "#8B949E",
};

function busSvg(color: string, heading: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <g transform="rotate(${heading} 22 22)">
      <circle cx="22" cy="22" r="18" fill="#1C2333" stroke="${color}" stroke-width="2.5"/>
      <path d="M22 9 L29 26 L22 22 L15 26 Z" fill="${color}"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

interface AnimatedMarker {
  marker: google.maps.Marker;
  curLat: number;
  curLng: number;
  targetLat: number;
  targetLng: number;
  rafId: number | null;
  startMs: number;
  fromLat: number;
  fromLng: number;
  duration: number;
  heading: number;
  status: MapBus["status"];
  busNumber: string;
  infoWindow: google.maps.InfoWindow;
}

export function GoogleMapView({
  buses,
  selectedBusId,
  myStop,
  polyline,
  onBusClick,
  onMapClick,
  className,
  stopDraggable = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, AnimatedMarker>>(new Map());
  const stopMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const initial =
          buses[0] ??
          (myStop ? { lat: myStop.lat, lng: myStop.lng } : { lat: 12.9716, lng: 77.5946 });
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: { lat: initial.lat, lng: initial.lng },
          zoom: 14,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          backgroundColor: "#0d1117",
        });
        if (onMapClick) {
          mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          });
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load Google Maps");
        setLoading(false);
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => {
        if (m.rafId) cancelAnimationFrame(m.rafId);
        m.marker.setMap(null);
        m.infoWindow.close();
      });
      markersRef.current.clear();
      stopMarkerRef.current?.setMap(null);
      polylineRef.current?.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync bus markers with smooth lerp
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = window.google;
    if (!g) return;

    const seen = new Set<string>();
    for (const b of buses) {
      seen.add(b.id);
      let entry = markersRef.current.get(b.id);
      const color = STATUS_COLOR[b.status];
      if (!entry) {
        const marker = new g.maps.Marker({
          map,
          position: { lat: b.lat, lng: b.lng },
          icon: {
            url: busSvg(color, b.heading),
            scaledSize: new g.maps.Size(44, 44),
            anchor: new g.maps.Point(22, 22),
          },
          title: b.busNumber,
        });
        const infoWindow = new g.maps.InfoWindow({
          content: `<div style="color:#E6EDF3;font-family:Inter,sans-serif;padding:4px 6px;">
            <div style="font-weight:600;font-size:13px;">${b.busNumber}</div>
            <div style="font-size:11px;color:#8B949E;">Status: ${b.status}</div>
          </div>`,
        });
        marker.addListener("click", () => {
          infoWindow.open({ anchor: marker, map });
          onBusClick?.(b);
        });
        entry = {
          marker,
          curLat: b.lat,
          curLng: b.lng,
          targetLat: b.lat,
          targetLng: b.lng,
          rafId: null,
          startMs: 0,
          fromLat: b.lat,
          fromLng: b.lng,
          duration: 0,
          heading: b.heading,
          status: b.status,
          busNumber: b.busNumber,
          infoWindow,
        };
        markersRef.current.set(b.id, entry);
      }

      // If status/heading changed, refresh the icon
      if (entry.heading !== b.heading || entry.status !== b.status) {
        entry.heading = b.heading;
        entry.status = b.status;
        entry.marker.setIcon({
          url: busSvg(color, b.heading),
          scaledSize: new g.maps.Size(44, 44),
          anchor: new g.maps.Point(22, 22),
        });
      }

      // Begin lerp toward new target
      const moved = distanceMeters(entry.curLat, entry.curLng, b.lat, b.lng);
      if (moved > 0.5) {
        entry.fromLat = entry.curLat;
        entry.fromLng = entry.curLng;
        entry.targetLat = b.lat;
        entry.targetLng = b.lng;
        entry.duration = moved > 200 ? 800 : 1500;
        entry.startMs = performance.now();
        if (entry.rafId) cancelAnimationFrame(entry.rafId);

        const tick = (t: number) => {
          if (!entry) return;
          const k = Math.min(1, (t - entry.startMs) / entry.duration);
          const e = k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2;
          entry.curLat = entry.fromLat + (entry.targetLat - entry.fromLat) * e;
          entry.curLng = entry.fromLng + (entry.targetLng - entry.fromLng) * e;
          entry.marker.setPosition({ lat: entry.curLat, lng: entry.curLng });
          if (k < 1) entry.rafId = requestAnimationFrame(tick);
          else entry.rafId = null;
        };
        entry.rafId = requestAnimationFrame(tick);
      }
    }

    // Remove markers no longer present
    for (const [id, entry] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        if (entry.rafId) cancelAnimationFrame(entry.rafId);
        entry.marker.setMap(null);
        entry.infoWindow.close();
        markersRef.current.delete(id);
      }
    }

    // Auto-pan to selected bus
    if (selectedBusId) {
      const sel = markersRef.current.get(selectedBusId);
      if (sel) map.panTo({ lat: sel.targetLat, lng: sel.targetLng });
    }
  }, [buses, selectedBusId, onBusClick]);

  // My Stop pin (draggable)
  useEffect(() => {
    const map = mapRef.current;
    const g = window.google;
    if (!map || !g) return;
    if (myStop) {
      if (!stopMarkerRef.current) {
        stopMarkerRef.current = new g.maps.Marker({
          map,
          position: myStop,
          draggable: stopDraggable,
          label: { text: "★", color: "#4F8EF7", fontSize: "16px", fontWeight: "700" },
          title: "My Stop",
        });
        if (stopDraggable && onMapClick) {
          stopMarkerRef.current.addListener("dragend", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          });
        }
      } else {
        stopMarkerRef.current.setPosition(myStop);
      }
    } else if (stopMarkerRef.current) {
      stopMarkerRef.current.setMap(null);
      stopMarkerRef.current = null;
    }
  }, [myStop, stopDraggable, onMapClick]);

  // Polyline (trip history)
  useEffect(() => {
    const map = mapRef.current;
    const g = window.google;
    if (!map || !g) return;
    polylineRef.current?.setMap(null);
    if (polyline && polyline.length > 1) {
      polylineRef.current = new g.maps.Polyline({
        map,
        path: polyline,
        strokeColor: "#4F8EF7",
        strokeOpacity: 0.85,
        strokeWeight: 3,
      });
      const bounds = new g.maps.LatLngBounds();
      polyline.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }
  }, [polyline]);

  if (error) {
    return (
      <div className={clsx("flex items-center justify-center glass rounded-xl p-6 text-sm text-destructive", className)}>
        {error}
      </div>
    );
  }

  return (
    <div className={clsx("relative rounded-xl overflow-hidden border border-border", className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
          <Spinner size="lg" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
