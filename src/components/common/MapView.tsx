import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Bus, MapPin } from "lucide-react";
import { distanceMeters } from "@/utils/mapUtils";

export interface MapBus {
  id: string;
  busNumber: string;
  lat: number;
  lng: number;
  heading: number;
  status: "active" | "idle" | "offline";
}

interface Props {
  buses: MapBus[];
  selectedBusId?: string | null;
  myStop?: { lat: number; lng: number } | null;
  polyline?: { lat: number; lng: number }[];
  onBusClick?: (bus: MapBus) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  showStubBanner?: boolean;
  stopDraggable?: boolean;
}

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const STATUS_COLOR: Record<MapBus["status"], string> = {
  active: "#22C55E",
  idle: "#F59E0B",
  offline: "#8B949E",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createBusIcon(bus: MapBus, selected: boolean): L.DivIcon {
  const color = STATUS_COLOR[bus.status];
  const label = escapeHtml(bus.busNumber);
  return L.divIcon({
    className: "leaflet-bus-div-icon",
    iconSize: [72, 72],
    iconAnchor: [36, 36],
    popupAnchor: [0, -24],
    html: `<div class="leaflet-bus-marker${selected ? " is-selected" : ""}" style="--bus-color:${color};--bus-heading:${bus.heading}deg;">
      <span class="leaflet-bus-marker__glow"></span>
      <span class="leaflet-bus-marker__chip">
        <svg viewBox="0 0 24 24" aria-hidden="true" role="img">
          <rect x="6.5" y="4.5" width="11" height="12" rx="2.5" ry="2.5" fill="var(--bus-color)" />
          <rect x="8.5" y="6.7" width="7" height="3.2" rx="0.8" fill="#0D1117" />
          <circle cx="9" cy="17.5" r="1.4" fill="#0D1117" />
          <circle cx="15" cy="17.5" r="1.4" fill="#0D1117" />
          <path d="M12 1.8L15.6 6.2H8.4L12 1.8Z" fill="var(--bus-color)" />
        </svg>
      </span>
      <span class="leaflet-bus-marker__label">${label}</span>
    </div>`,
  });
}

function createPopupHtml(bus: MapBus): string {
  const status = escapeHtml(bus.status);
  const busNumber = escapeHtml(bus.busNumber);
  return `<div class="leaflet-popup-shell">
    <p class="leaflet-popup-shell__title">${busNumber}</p>
    <p class="leaflet-popup-shell__meta">Status: ${status}</p>
  </div>`;
}

export function MapView({
  buses,
  selectedBusId,
  myStop,
  polyline,
  onBusClick,
  onMapClick,
  className,
  showStubBanner = false,
  stopDraggable = true,
}: Props) {
  const initialCenter = useMemo(() => {
    const selected = selectedBusId ? buses.find((bus) => bus.id === selectedBusId) : null;
    if (selected) return { lat: selected.lat, lng: selected.lng };
    if (buses[0]) return { lat: buses[0].lat, lng: buses[0].lng };
    if (myStop) return { lat: myStop.lat, lng: myStop.lng };
    return DEFAULT_CENTER;
  }, [buses, myStop, selectedBusId]);

  return (
    <div
      className={clsx(
        "relative w-full h-full overflow-hidden rounded-xl border border-border bg-surface",
        onMapClick && "cursor-crosshair",
        className,
      )}
    >
      <MapContainer center={[initialCenter.lat, initialCenter.lng]} zoom={14} className="h-full w-full" zoomControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        />
        <MapClickCapture onMapClick={onMapClick} />
        <MapViewportController
          buses={buses}
          selectedBusId={selectedBusId}
          myStop={myStop}
          polyline={polyline}
        />
        <TripPolyline polyline={polyline} />
        <StopMarker myStop={myStop} onMapClick={onMapClick} stopDraggable={stopDraggable} />

        {buses.map((bus) => (
          <AnimatedBusMarker
            key={bus.id}
            bus={bus}
            selected={selectedBusId === bus.id}
            onBusClick={onBusClick}
          />
        ))}
      </MapContainer>

      {buses.length === 0 && !myStop && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-muted-foreground">
          <MapPin className="h-8 w-8" />
          <p className="text-sm mt-2">No buses to show</p>
        </div>
      )}

      {showStubBanner && (
        <div className="absolute top-3 left-3 glass rounded-md px-2.5 py-1.5 text-[11px] flex items-center gap-2 z-10">
          <Bus className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">OpenStreetMap · Leaflet</span>
        </div>
      )}
    </div>
  );
}

interface AnimatedBusMarkerProps {
  bus: MapBus;
  selected: boolean;
  onBusClick?: (bus: MapBus) => void;
}

function AnimatedBusMarker({ bus, selected, onBusClick }: AnimatedBusMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const currentRef = useRef<{ lat: number; lng: number }>({ lat: bus.lat, lng: bus.lng });
  const rafRef = useRef<number | null>(null);
  const initialPosition = useRef<[number, number]>([bus.lat, bus.lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    marker.setIcon(createBusIcon(bus, selected));
    const html = createPopupHtml(bus);
    if (!marker.getPopup()) {
      marker.bindPopup(html, { className: "leaflet-dark-popup", offset: [0, -18] });
    } else {
      marker.getPopup()?.setContent(html);
    }
  }, [bus, selected]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const from = currentRef.current;
    const to = { lat: bus.lat, lng: bus.lng };
    const moved = distanceMeters(from.lat, from.lng, to.lat, to.lng);

    if (moved <= 0.5) {
      currentRef.current = to;
      marker.setLatLng(to);
      return;
    }

    const duration = moved > 200 ? 800 : 1500;
    const startMs = performance.now();

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const tick = (nowMs: number) => {
      const k = Math.min(1, (nowMs - startMs) / duration);
      const eased = k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const lat = from.lat + (to.lat - from.lat) * eased;
      const lng = from.lng + (to.lng - from.lng) * eased;
      marker.setLatLng({ lat, lng });
      currentRef.current = { lat, lng };

      if (k < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [bus.lat, bus.lng]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <Marker
      ref={(marker) => {
        markerRef.current = marker;
      }}
      position={initialPosition.current}
      icon={createBusIcon(bus, selected)}
      eventHandlers={{
        click: () => {
          markerRef.current?.openPopup();
          onBusClick?.(bus);
        },
      }}
      keyboard={false}
    />
  );
}

function StopMarker({
  myStop,
  onMapClick,
  stopDraggable,
}: {
  myStop?: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  stopDraggable: boolean;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  if (!myStop) return null;

  return (
    <Marker
      ref={(marker) => {
        markerRef.current = marker;
      }}
      position={[myStop.lat, myStop.lng]}
      draggable={stopDraggable}
      eventHandlers={
        stopDraggable
          ? {
              dragend: () => {
                const marker = markerRef.current;
                if (!marker || !onMapClick) return;
                const next = marker.getLatLng();
                onMapClick({ lat: next.lat, lng: next.lng });
              },
            }
          : undefined
      }
    />
  );
}

function MapClickCapture({
  onMapClick,
}: {
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click: (event) => {
      onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function TripPolyline({
  polyline,
}: {
  polyline?: { lat: number; lng: number }[];
}) {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    polylineRef.current?.remove();
    polylineRef.current = null;

    if (!polyline || polyline.length < 2) return;

    polylineRef.current = L.polyline(
      polyline.map((p) => [p.lat, p.lng] as [number, number]),
      { color: "#4F8EF7", weight: 3, opacity: 0.85 },
    ).addTo(map);

    return () => {
      polylineRef.current?.remove();
      polylineRef.current = null;
    };
  }, [map, polyline]);

  return null;
}

function MapViewportController({
  buses,
  selectedBusId,
  myStop,
  polyline,
}: {
  buses: MapBus[];
  selectedBusId?: string | null;
  myStop?: { lat: number; lng: number } | null;
  polyline?: { lat: number; lng: number }[];
}) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    const selected = selectedBusId ? buses.find((bus) => bus.id === selectedBusId) : null;
    if (selected) {
      map.panTo([selected.lat, selected.lng], { animate: true, duration: 0.5 });
      return;
    }

    if (polyline && polyline.length > 1) {
      const bounds = L.latLngBounds(polyline.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
      initializedRef.current = true;
      return;
    }

    if (initializedRef.current) return;

    const points = buses.map((bus) => [bus.lat, bus.lng] as [number, number]);
    if (myStop) points.push([myStop.lat, myStop.lng]);
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 15, { animate: false });
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
    initializedRef.current = true;
  }, [buses, map, myStop, polyline, selectedBusId]);

  return null;
}
