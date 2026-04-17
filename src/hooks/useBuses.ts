import { useEffect, useState } from "react";
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

function toBus(id: string, d: DocumentData): BusDoc {
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
    status: (d.status ?? "offline") as BusStatus,
    currentTripId: d.currentTripId ?? null,
    lastUpdated: d.lastUpdated ?? null,
  };
}

/** Subscribes to a single bus document. */
export function useBusLocation(busId: string | null | undefined) {
  const [bus, setBus] = useState<BusDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !busId) {
      setLoading(false);
      setBus(null);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "buses", busId),
      (snap) => {
        setBus(snap.exists() ? toBus(snap.id, snap.data()) : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [busId]);

  return { bus, loading, error };
}

/** Subscribes to all buses (admin fleet view). */
export function useAllBuses() {
  const [buses, setBuses] = useState<BusDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, "buses"),
      (snap) => {
        const list = snap.docs.map((d) => toBus(d.id, d.data()));
        list.sort((a, b) => a.busNumber.localeCompare(b.busNumber));
        setBuses(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { buses, loading, error };
}
