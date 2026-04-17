import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import type { Role } from "@/utils/constants";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  assignedBusId: string | null;
  photoURL: string | null;
}

export async function fetchUserProfile(fbUser: FirebaseUser): Promise<AppUser | null> {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? data.email ?? "",
    name: data.name ?? fbUser.email ?? "User",
    role: data.role as Role,
    assignedBusId: data.assignedBusId ?? null,
    photoURL: data.photoURL ?? null,
  };
}

export async function signIn(email: string, password: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured. Add your VITE_FIREBASE_* env vars.");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  if (!isFirebaseConfigured) return;
  return fbSignOut(auth);
}

export function onAuthChange(cb: (user: FirebaseUser | null) => void) {
  if (!isFirebaseConfigured) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

/** Upsert a user profile doc (used by seed script) */
export async function upsertUserProfile(uid: string, data: Omit<AppUser, "uid">) {
  await setDoc(
    doc(db, "users", uid),
    { ...data, createdAt: serverTimestamp() },
    { merge: true },
  );
}
