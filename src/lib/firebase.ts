import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDc26C2c5xVySTyD0JyLdhJGwgspNAVDWA",
  authDomain: "nfl-stream-406420.firebaseapp.com",
  projectId: "nfl-stream-406420",
  storageBucket: "nfl-stream-406420.firebasestorage.app",
  messagingSenderId: "362530996210",
  appId: "1:362530996210:web:9f0e7451bf442a416a356b",
  measurementId: "G-66BTRJWG9X",
};

// Frontend allowlist. The backend will be the real authority once Cloud Run
// starts validating Firebase ID tokens — this is a UX gate only.
export const EMAIL_ALLOWLIST: ReadonlyArray<string> = [
  "csells10@gmail.com",
];

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_ALLOWLIST.includes(email.toLowerCase().trim());
}

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

/**
 * Returns the current user's Firebase ID token, or null if not signed in.
 * Uses Firebase's built-in caching/refresh — safe to call on every request.
 */
export async function getAuthToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (err) {
    console.error("[firebase] Failed to get ID token:", err);
    return null;
  }
}
