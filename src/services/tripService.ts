import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface StartTripInput {
  busId: string;
  driverId: string;
  lat: number;
  lng: number;
}

/** Create trips/{tripId} and flip bus to active. Returns tripId. */
export async function startTrip({ busId, driverId, lat, lng }: StartTripInput): Promise<string> {
  const tripRef = await addDoc(collection(db, "trips"), {
    busId,
    driverId,
    startTime: serverTimestamp(),
    endTime: null,
    status: "ongoing",
    totalDistance: 0,
    startLat: lat,
    startLng: lng,
  });
  await updateDoc(doc(db, "buses", busId), {
    status: "active",
    currentTripId: tripRef.id,
    driverId,
    lat,
    lng,
    lastUpdated: serverTimestamp(),
  });
  await setDoc(
    doc(db, "users", driverId),
    {
      lastLocation: {
        lat,
        lng,
        heading: 0,
        speed: 0,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true },
  );
  return tripRef.id;
}

export interface LocationUpdate {
  busId: string;
  driverId: string;
  tripId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

/** Update bus doc + append to locationLog subcollection. */
export async function pushLocation({ busId, driverId, tripId, lat, lng, heading, speed }: LocationUpdate) {
  await updateDoc(doc(db, "buses", busId), {
    lat,
    lng,
    heading,
    speed,
    lastUpdated: serverTimestamp(),
  });
  await setDoc(
    doc(db, "users", driverId),
    {
      lastLocation: {
        lat,
        lng,
        heading,
        speed,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true },
  );
  await addDoc(collection(db, "trips", tripId, "locationLog"), {
    lat,
    lng,
    speed,
    timestamp: serverTimestamp(),
  });
}

export async function endTrip(busId: string, tripId: string, totalDistanceKm: number) {
  await updateDoc(doc(db, "trips", tripId), {
    endTime: serverTimestamp(),
    status: "completed",
    totalDistance: totalDistanceKm,
  });
  await updateDoc(doc(db, "buses", busId), {
    status: "idle",
    currentTripId: null,
    speed: 0,
    lastUpdated: serverTimestamp(),
  });
}
