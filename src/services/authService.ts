import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import type { Role } from "@/utils/constants";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export const ADMIN_USERNAME = "srmadmin";
export const ADMIN_EMAIL = "srmadmin@transitiq.edu";
export const ADMIN_PASSWORD = "srmadmin@123";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  approvalStatus: ApprovalStatus;
  assignedBusId: string | null;
  phoneNumber: string | null;
  registrationNumber: string | null;
  collegeEmail: string | null;
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
    approvalStatus: (data.approvalStatus ?? "approved") as ApprovalStatus,
    assignedBusId: data.assignedBusId ?? null,
    phoneNumber: data.phoneNumber ?? null,
    registrationNumber: data.registrationNumber ?? null,
    collegeEmail: data.collegeEmail ?? null,
    photoURL: data.photoURL ?? null,
  };
}

export function normalizeLoginIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.toLowerCase() === ADMIN_USERNAME) return ADMIN_EMAIL;
  return trimmed;
}

export async function ensureDefaultAdminAccount() {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured. Add your VITE_FIREBASE_* env vars.");
  try {
    const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        email: ADMIN_EMAIL,
        name: "SRM Admin",
        role: "admin",
        approvalStatus: "approved",
        assignedBusId: null,
        phoneNumber: null,
        registrationNumber: null,
        collegeEmail: null,
        photoURL: null,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("email-already-in-use")) throw err;
  }
}

export async function signIn(email: string, password: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured. Add your VITE_FIREBASE_* env vars.");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  if (!isFirebaseConfigured) return;
  return fbSignOut(auth);
}

export async function requestPasswordReset(email: string) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured.");
  return sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: true,
  });
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
