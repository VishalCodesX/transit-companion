import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/services/firebase";
import type { BusStatus } from "@/utils/constants";
import { BUS_STALE_MS } from "@/utils/constants";

export interface BusDoc {
  id: string;
  busNumber: string;
  routeName: string;
  licensePlate: string;
  capacity: number;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  driverId: string | null;
  driverName: string | null;
  status: BusStatus;
  currentTripId: string | null;
  lastUpdated: Timestamp | null;
}

function now() { return Timestamp.now(); }

function effectiveStatus(raw: BusStatus, lastUpdated: Timestamp | null): BusStatus {
  if (raw === "active" && lastUpdated) {
    const elapsed = now().toMillis() - lastUpdated.toMillis();
    if (elapsed > BUS_STALE_MS) return "offline";
  }
  return raw;
}

function toBus(id: string, d: DocumentData): BusDoc {
  const rawStatus = (d.status ?? "offline") as BusStatus;
  const lastUpdated = d.lastUpdated ?? null;
  return {
    id,
    busNumber: d.busNumber ?? "",
    routeName: d.routeName ?? "",
    licensePlate: d.licensePlate ?? "",
    capacity: d.capacity ?? 0,
    lat: d.lat ?? 0,
    lng: d.lng ?? 0,
    heading: d.heading ?? 0,
    speed: d.speed ?? 0,
    driverId: d.driverId ?? null,
    driverName: d.driverName ?? null,
    status: effectiveStatus(rawStatus, lastUpdated),
    currentTripId: d.currentTripId ?? null,
    lastUpdated,
  };
}

/** Periodically re-evaluate effective bus status for stale detection. */
function useStaleTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

/** Subscribes to a single bus document. */
export function useBusLocation(busId: string | null | undefined) {
  const [raw, setRaw] = useState<{ id: string; data: DocumentData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tick = useStaleTick();

  useEffect(() => {
    if (!isFirebaseConfigured || !busId) {
      setLoading(false);
      setRaw(null);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "buses", busId),
      (snap) => {
        setRaw(snap.exists() ? { id: snap.id, data: snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [busId]);

  const bus = useMemo(() => (raw ? toBus(raw.id, raw.data) : null), [raw, tick]);

  return { bus, loading, error };
}

/** Subscribes to all buses (admin fleet view). */
export function useAllBuses() {
  const [rawList, setRawList] = useState<{ id: string; data: DocumentData }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tick = useStaleTick();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "buses"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        setRawList(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const buses = useMemo(() => {
    const list = rawList.map((r) => toBus(r.id, r.data));
    list.sort((a, b) => a.busNumber.localeCompare(b.busNumber));
    return list;
  }, [rawList, tick]);

  return { buses, loading, error };
}
