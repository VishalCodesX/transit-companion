import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/services/firebase";

export interface TripDoc {
  id: string;
  busId: string;
  driverId: string;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  status: "ongoing" | "completed";
  totalDistance: number;
  startLat: number;
  startLng: number;
}

function toTrip(id: string, d: DocumentData): TripDoc {
  return {
    id,
    busId: d.busId ?? "",
    driverId: d.driverId ?? "",
    startTime: d.startTime ?? null,
    endTime: d.endTime ?? null,
    status: (d.status ?? "ongoing") as TripDoc["status"],
    totalDistance: d.totalDistance ?? 0,
    startLat: d.startLat ?? 0,
    startLng: d.startLng ?? 0,
  };
}

export interface TripFilters {
  busId?: string;
  driverId?: string;
  /** ISO string (yyyy-mm-dd) or Date */
  from?: Date | null;
  to?: Date | null;
}

/** Realtime listener over trips with optional filters. Composite indexes may
 *  be required by Firestore — falls back to client-side filter on common ones. */
export function useTripHistory(filters: TripFilters = {}) {
  const [trips, setTrips] = useState<TripDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { busId, driverId, from, to } = filters;
  const fromMs = from?.getTime();
  const toMs = to?.getTime();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const constraints: QueryConstraint[] = [orderBy("startTime", "desc")];
    if (busId) constraints.push(where("busId", "==", busId));
    if (driverId) constraints.push(where("driverId", "==", driverId));
    const q = query(collection(db, "trips"), ...constraints);

    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => toTrip(d.id, d.data()));
        if (fromMs) list = list.filter((t) => (t.startTime?.toMillis() ?? 0) >= fromMs);
        if (toMs) list = list.filter((t) => (t.startTime?.toMillis() ?? 0) <= toMs);
        setTrips(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // If a composite index is missing, Firestore returns a helpful URL — surface it.
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [busId, driverId, fromMs, toMs]);

  return { trips, loading, error };
}

/** One-shot fetch of locationLog for drawing a polyline. */
export interface LocationLogPoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: Timestamp | null;
}

export async function fetchTripPath(tripId: string): Promise<LocationLogPoint[]> {
  const snap = await getDocs(
    query(collection(db, "trips", tripId, "locationLog"), orderBy("timestamp", "asc")),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      lat: data.lat,
      lng: data.lng,
      speed: data.speed ?? 0,
      timestamp: data.timestamp ?? null,
    };
  });
}
