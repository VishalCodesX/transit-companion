import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Bus, MapPin, Navigation } from "lucide-react";
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
  /** Buses to render. */
  buses: MapBus[];
  /** Optional selected/highlighted bus id. */
  selectedBusId?: string | null;
  /** Optional "my stop" pin (student view). */
  myStop?: { lat: number; lng: number } | null;
  /** Click handler — also receives a synthetic "tap" with map coords. */
  onBusClick?: (bus: MapBus) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  /** Show the "API key pending" banner (default true). */
  showStubBanner?: boolean;
}

/**
 * Stylized SVG-based "map" that supports multiple buses with smooth position
 * interpolation between Firestore updates. Drop-in replacement target for the
 * future Google Maps integration.
 */
export function MapView({
  buses,
  selectedBusId,
  myStop,
  onBusClick,
  onMapClick,
  className,
  showStubBanner = true,
}: Props) {
  // Compute a stable bounding box across all bus + stop coords so we can project
  // lat/lng to viewport %.
  const bounds = useMemo(() => {
    const coords: { lat: number; lng: number }[] = buses.map((b) => ({ lat: b.lat, lng: b.lng }));
    if (myStop) coords.push(myStop);
    if (coords.length === 0) {
      return { minLat: 12.965, maxLat: 12.98, minLng: 77.585, maxLng: 77.605 };
    }
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const c of coords) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
      minLat = Math.min(minLat, c.lat);
      maxLat = Math.max(maxLat, c.lat);
      minLng = Math.min(minLng, c.lng);
      maxLng = Math.max(maxLng, c.lng);
    }
    // Pad
    const padLat = Math.max((maxLat - minLat) * 0.25, 0.002);
    const padLng = Math.max((maxLng - minLng) * 0.25, 0.002);
    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [buses, myStop]);

  function project(lat: number, lng: number) {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 100;
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 100;
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
  }

  function unproject(xPct: number, yPct: number) {
    const lng = bounds.minLng + (xPct / 100) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.minLat + (1 - yPct / 100) * (bounds.maxLat - bounds.minLat);
    return { lat, lng };
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onMapClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onMapClick(unproject(xPct, yPct));
  }

  return (
    <div
      className={clsx(
        "relative w-full h-full overflow-hidden rounded-xl border border-border bg-surface",
        onMapClick && "cursor-crosshair",
        className,
      )}
      onClick={handleClick}
    >
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 85%)",
        }}
      />
      {/* Soft glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-[60%] w-[60%] rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Empty state */}
      {buses.length === 0 && !myStop && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <MapPin className="h-8 w-8" />
          <p className="text-sm mt-2">No buses to show</p>
        </div>
      )}

      {/* My Stop pin */}
      {myStop && (
        <PinMarker
          x={project(myStop.lat, myStop.lng).x}
          y={project(myStop.lat, myStop.lng).y}
          label="My Stop"
        />
      )}

      {/* Bus markers (smoothly animated) */}
      {buses.map((b) => (
        <SmoothBusMarker
          key={b.id}
          bus={b}
          targetLat={b.lat}
          targetLng={b.lng}
          project={project}
          selected={selectedBusId === b.id}
          onClick={onBusClick ? () => onBusClick(b) : undefined}
        />
      ))}

      {showStubBanner && (
        <div className="absolute top-3 left-3 glass rounded-md px-2.5 py-1.5 text-[11px] flex items-center gap-2 z-10">
          <Bus className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Map preview · API key pending</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- markers ---------------- */

interface SmoothMarkerProps {
  bus: MapBus;
  targetLat: number;
  targetLng: number;
  project: (lat: number, lng: number) => { x: number; y: number };
  selected: boolean;
  onClick?: () => void;
}

/** Lerps marker position toward the target lat/lng over ~1.5s using rAF. */
function SmoothBusMarker({ bus, targetLat, targetLng, project, selected, onClick }: SmoothMarkerProps) {
  const [pos, setPos] = useState<{ lat: number; lng: number }>({ lat: targetLat, lng: targetLng });
  const animRef = useRef<number | null>(null);
  const fromRef = useRef<{ lat: number; lng: number }>({ lat: targetLat, lng: targetLng });
  const startRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = pos;
    startRef.current = performance.now();
    const moved = distanceMeters(pos.lat, pos.lng, targetLat, targetLng);
    const duration = moved > 200 ? 800 : 1500; // big jumps animate quicker
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const tick = (t: number) => {
      const k = Math.min(1, (t - startRef.current) / duration);
      // ease-in-out cubic
      const e = k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const lat = fromRef.current.lat + (targetLat - fromRef.current.lat) * e;
      const lng = fromRef.current.lng + (targetLng - fromRef.current.lng) * e;
      setPos({ lat, lng });
      if (k < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLat, targetLng]);

  const { x, y } = project(pos.lat, pos.lng);
  const ringColor =
    bus.status === "active" ? "ring-success" : bus.status === "idle" ? "ring-warning" : "ring-muted-foreground";
  const glow =
    bus.status === "active" ? "bg-success/40" : bus.status === "idle" ? "bg-warning/30" : "bg-muted/20";

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <div className={clsx("absolute inset-0 rounded-full blur-xl", glow)} />
        <div
          className={clsx(
            "relative flex h-11 w-11 items-center justify-center rounded-full bg-surface-elevated ring-2 transition-transform",
            ringColor,
            selected && "scale-110 shadow-glow",
          )}
          style={{ transform: `rotate(${bus.heading}deg)` }}
        >
          <Navigation
            className={clsx(
              "h-5 w-5",
              bus.status === "active" ? "text-success" : bus.status === "idle" ? "text-warning" : "text-muted-foreground",
            )}
            fill="currentColor"
          />
        </div>
      </div>
      <div className="mt-1.5 glass rounded-md px-2 py-0.5 text-[10px] font-mono whitespace-nowrap text-center">
        {bus.busNumber}
      </div>
    </button>
  );
}

function PinMarker({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="flex flex-col items-center">
        <div className="glass rounded-md px-2 py-0.5 text-[10px] font-medium mb-1">{label}</div>
        <MapPin className="h-6 w-6 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" fill="currentColor" />
      </div>
    </div>
  );
}
