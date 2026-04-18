/**
 * Dev-only seed script. Creates demo accounts and bus docs in Firebase.
 * IMPORTANT: this signs in/out as different users to set Auth state side-effects;
 * we use a *secondary* Firebase app to create accounts without disrupting the
 * primary auth session.
 */
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured, firebaseConfig } from "@/services/firebase";
import type { Role } from "@/utils/constants";

interface SeedAccount {
  email: string;
  password: string;
  name: string;
  role: Role;
  assignedBusId: string | null;
}

const ACCOUNTS: SeedAccount[] = [
  { email: "admin@transitiq.edu",   password: "Admin@1234",   name: "Alex Admin",     role: "admin",   assignedBusId: null },
  { email: "driver1@transitiq.edu", password: "Driver@1234",  name: "Daniel Rivera",  role: "driver",  assignedBusId: "bus-01" },
  { email: "driver2@transitiq.edu", password: "Driver@1234",  name: "Priya Sharma",   role: "driver",  assignedBusId: "bus-02" },
  { email: "student1@transitiq.edu", password: "Student@1234", name: "Sam Chen",      role: "student", assignedBusId: "bus-01" },
  { email: "student2@transitiq.edu", password: "Student@1234", name: "Maya Patel",    role: "student", assignedBusId: "bus-02" },
  { email: "student3@transitiq.edu", password: "Student@1234", name: "Jordan Lee",    role: "student", assignedBusId: "bus-03" },
];

const BUSES = [
  { id: "bus-01", busNumber: "Bus 01", routeName: "Route A — North Campus", licensePlate: "UNIV-001", capacity: 40, lat: 12.9716, lng: 77.5946 },
  { id: "bus-02", busNumber: "Bus 02", routeName: "Route B — South Campus", licensePlate: "UNIV-002", capacity: 40, lat: 12.9750, lng: 77.6000 },
  { id: "bus-03", busNumber: "Bus 03", routeName: "Route C — East Campus",  licensePlate: "UNIV-003", capacity: 36, lat: 12.9680, lng: 77.5900 },
];

export interface SeedResult {
  buses: number;
  accountsCreated: number;
  accountsSkipped: number;
  errors: string[];
}

export async function seedDatabase(): Promise<SeedResult> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add VITE_FIREBASE_* env vars first.");
  }

  const result: SeedResult = { buses: 0, accountsCreated: 0, accountsSkipped: 0, errors: [] };

  // 1) Buses
  for (const b of BUSES) {
    await setDoc(
      doc(db, "buses", b.id),
      {
        busNumber: b.busNumber,
        routeName: b.routeName,
        licensePlate: b.licensePlate,
        capacity: b.capacity,
        lat: b.lat,
        lng: b.lng,
        heading: 0,
        speed: 0,
        driverId: null,
        driverName: null,
        status: "idle",
        currentTripId: null,
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );
    result.buses++;
  }

  // 2) Accounts via secondary app (so we don't disturb the primary session)
  const secondary = initializeApp(firebaseConfig, "transitiq-seed");
  const secondaryAuth = getAuth(secondary);

  try {
    for (const acc of ACCOUNTS) {
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, acc.email, acc.password);
        await setDoc(doc(db, "users", cred.user.uid), {
          email: acc.email,
          name: acc.name,
          role: acc.role,
          assignedBusId: acc.assignedBusId,
          photoURL: null,
          createdAt: serverTimestamp(),
        });

        // If a driver, set them on the assigned bus doc
        if (acc.role === "driver" && acc.assignedBusId) {
          await setDoc(
            doc(db, "buses", acc.assignedBusId),
            { driverId: cred.user.uid, driverName: acc.name },
            { merge: true },
          );
        }

        await signOut(secondaryAuth);
        result.accountsCreated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("email-already-in-use")) {
          result.accountsSkipped++;
          // Best-effort: ensure profile doc exists. We can't get UID without sign-in,
          // so we only ensure bus assignment for known driver emails by skipping silently.
        } else {
          result.errors.push(`${acc.email}: ${msg}`);
        }
      }
    }
  } finally {
    await deleteApp(secondary).catch(() => {});
  }

  return result;
}

export const SEED_CREDENTIALS = ACCOUNTS.map(({ email, password, role }) => ({ email, password, role }));

// Used by Login UI for safe display
export async function isAdminSeeded(): Promise<boolean> {
  try {
    // Check if at least one bus exists
    const snap = await getDoc(doc(db, "buses", "bus-01"));
    return snap.exists();
  } catch {
    return false;
  }
}
