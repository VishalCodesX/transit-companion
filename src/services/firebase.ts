import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported as analyticsSupported, type Analytics } from "firebase/analytics";

/**
 * Firebase web config.
 *
 * These values are PUBLISHABLE — Firebase web config is designed to be shipped
 * in client-side code. Real security is enforced by:
 *   1. Firestore Security Rules
 *   2. Authorized Domains list in Firebase Auth settings
 *   3. (Optional) API key restrictions in Google Cloud Console
 *
 * Env vars override these defaults when present, so you can swap projects per
 * environment without code changes.
 */
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyAdKwG6t_nRk-8l2UdWrlJjh3YFazf56VE",
  authDomain: "transitiq-11.firebaseapp.com",
  projectId: "transitiq-11",
  storageBucket: "transitiq-11.firebasestorage.app",
  messagingSenderId: "268775111323",
  appId: "1:268775111323:web:e3fc802603cef61fb0243e",
  measurementId: "G-X6XHLLFHJD",
};

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? DEFAULT_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? DEFAULT_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? DEFAULT_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? DEFAULT_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? DEFAULT_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? DEFAULT_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? DEFAULT_CONFIG.measurementId,
};

export const firebaseConfig = cfg;
export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _analytics: Analytics | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(cfg);
  _auth = getAuth(app);
  _db = getFirestore(app);

  // Analytics only loads in browsers that support it (skips SSR / unsupported envs).
  analyticsSupported()
    .then((ok) => {
      if (ok && app) _analytics = getAnalytics(app);
    })
    .catch(() => {
      /* analytics is optional — ignore failures */
    });
}

export const auth = _auth as Auth;
export const db = _db as Firestore;
export const analytics = () => _analytics;
export default app;
