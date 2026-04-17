import { useEffect, useRef, useState, useCallback } from "react";
import { distanceMeters, bearing, speedKmh } from "@/utils/mapUtils";
import { GPS_THROTTLE_METERS, GPS_THROTTLE_MS } from "@/utils/constants";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number;
  speed: number; // km/h
  timestamp: number;
}

export interface UseGeoLocationOptions {
  enabled: boolean;
  onUpdate?: (pos: GeoPosition, deltaMeters: number) => void;
  throttleMeters?: number;
  throttleMs?: number;
}

export interface UseGeoLocationReturn {
  position: GeoPosition | null;
  accuracy: number | null;
  error: string | null;
  supported: boolean;
  /** Total distance travelled (metres) since hook started */
  totalDistance: number;
}

/**
 * Watches the browser GPS. Throttles `onUpdate` callbacks: fires only when the
 * device has moved more than `throttleMeters` OR `throttleMs` has elapsed
 * since the last accepted update.
 */
export function useGeoLocation({
  enabled,
  onUpdate,
  throttleMeters = GPS_THROTTLE_METERS,
  throttleMs = GPS_THROTTLE_MS,
}: UseGeoLocationOptions): UseGeoLocationReturn {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const lastAcceptedRef = useRef<GeoPosition | null>(null);
  const lastRawRef = useRef<GeoPosition | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !supported) return;
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        const prev = lastRawRef.current;
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;

        let heading = p.coords.heading ?? 0;
        let speed = (p.coords.speed ?? 0) * 3.6; // m/s -> km/h

        if (prev) {
          const d = distanceMeters(prev.lat, prev.lng, lat, lng);
          const dt = now - prev.timestamp;
          if (d > 1) heading = bearing(prev.lat, prev.lng, lat, lng);
          if (!p.coords.speed && dt > 0) speed = speedKmh(d, dt);
        }

        const next: GeoPosition = {
          lat,
          lng,
          accuracy: p.coords.accuracy,
          heading,
          speed: Math.max(0, speed),
          timestamp: now,
        };
        lastRawRef.current = next;
        setPosition(next);

        // Throttle Firestore writes
        const last = lastAcceptedRef.current;
        const moved = last ? distanceMeters(last.lat, last.lng, lat, lng) : Infinity;
        const elapsed = last ? now - last.timestamp : Infinity;
        if (moved >= throttleMeters || elapsed >= throttleMs) {
          lastAcceptedRef.current = next;
          if (last && Number.isFinite(moved)) {
            setTotalDistance((d) => d + moved);
          }
          onUpdateRef.current?.(next, Number.isFinite(moved) ? moved : 0);
        }
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please enable GPS access in your browser settings."
            : err.code === err.POSITION_UNAVAILABLE
              ? "GPS signal unavailable. Move to an area with better signal."
              : err.message || "Failed to acquire GPS location.";
        setError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, supported, throttleMeters, throttleMs]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      lastAcceptedRef.current = null;
      lastRawRef.current = null;
      setTotalDistance(0);
    }
  }, [enabled]);

  return {
    position,
    accuracy: position?.accuracy ?? null,
    error,
    supported,
    totalDistance,
  };
}

/** Live HH:MM:SS counter from a start timestamp (ms). */
export function useTripTimer(startMs: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  if (!startMs) return { elapsed: "00:00:00", elapsedMs: 0 };
  const ms = Math.max(0, now - startMs);
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return { elapsed: `${hh}:${mm}:${ss}`, elapsedMs: ms };
}

// Re-export so the hook lives at hooks/useGeoLocation by convention
export default useGeoLocation;
