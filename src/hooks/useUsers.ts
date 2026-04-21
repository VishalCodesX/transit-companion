import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/services/firebase";
import type { Role } from "@/utils/constants";

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: Role;
  assignedBusId: string | null;
  photoURL: string | null;
  lastLocation: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    updatedAt: Timestamp | null;
  } | null;
  createdAt: Timestamp | null;
}

function toUser(uid: string, d: DocumentData): UserDoc {
  const rawLocation = d.lastLocation;
  const hasValidLocation =
    rawLocation &&
    typeof rawLocation === "object" &&
    Number.isFinite(rawLocation.lat) &&
    Number.isFinite(rawLocation.lng);

  return {
    uid,
    name: d.name ?? "",
    email: d.email ?? "",
    role: (d.role ?? "student") as Role,
    assignedBusId: d.assignedBusId ?? null,
    photoURL: d.photoURL ?? null,
    lastLocation: hasValidLocation
      ? {
          lat: Number(rawLocation.lat),
          lng: Number(rawLocation.lng),
          heading: Number.isFinite(rawLocation.heading) ? Number(rawLocation.heading) : 0,
          speed: Number.isFinite(rawLocation.speed) ? Number(rawLocation.speed) : 0,
          updatedAt: rawLocation.updatedAt ?? null,
        }
      : null,
    createdAt: d.createdAt ?? null,
  };
}

/** Realtime listener over all users (admin only). */
export function useAllUsers() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => toUser(d.id, d.data())));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { users, loading };
}

/** One-shot fetch (used by simple selects). */
export async function fetchAllUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(query(collection(db, "users")));
  return snap.docs.map((d) => toUser(d.id, d.data()));
}
