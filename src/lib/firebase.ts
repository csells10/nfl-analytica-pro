import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from "firebase/auth";
import { recordAuthDebug } from "@/lib/auth-debug";

const firebaseConfig = {
  apiKey: "AIzaSyDc26C2c5xVySTyD0JyLdhJGwgspNAVDWA",
  authDomain: "auth.gamelens.io",
  projectId: "nfl-stream-406420",
  storageBucket: "nfl-stream-406420.firebasestorage.app",
  messagingSenderId: "362530996210",
  appId: "1:362530996210:web:9f0e7451bf442a416a356b",
  measurementId: "G-66BTRJWG9X",
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

/**
 * OAuth 2.0 Web Client ID for project nfl-stream-406420 — the same Web
 * client that Firebase Auth uses. Sourced from Google Cloud Console →
 * APIs & Services → Credentials. Public by design (it's an OAuth client
 * ID, not a secret).
 *
 * Used by Google Identity Services (src/lib/gis.ts) on iPhone Chrome
 * (CriOS) to obtain an ID token that AuthContext exchanges for a
 * Firebase session via signInWithCredential — avoiding the
 * /__/auth/handler round-trip that breaks on iOS Chrome.
 */
export const GOOGLE_WEB_CLIENT_ID =
  "362530996210-ke3ajdjovtr7514m3rdrlum715dt5o38.apps.googleusercontent.com";

/**
 * Initialize Auth with explicit persistence chain and popup/redirect resolver
 * so iOS Chrome (CriOS) has both configured before the redirect round-trip.
 *
 * Falls back to getAuth(app) only for the expected "already-initialized" case
 * (HMR / duplicate import). Any other error is rethrown so we don't silently
 * mask a real misconfiguration.
 */
function createFirebaseAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (err) {
    const code = (err as { code?: string })?.code ?? null;
    // Firebase throws auth/already-initialized when initializeAuth runs twice
    // on the same app (HMR, double import). That's the only case we tolerate.
    if (code === "auth/already-initialized") {
      try {
        recordAuthDebug("initializeAuth:fallback", {
          phase: "init_fallback",
          errorCode: code,
        });
      } catch {
        /* recordAuthDebug is best-effort during init */
      }
      return getAuth(firebaseApp);
    }
    throw err;
  }
}

export const firebaseAuth: Auth = createFirebaseAuth();
export const googleProvider = new GoogleAuthProvider();

/**
 * True for iPhone/iPad/iPod/Android, including iPadOS (Mac UA + touch).
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isIPadOS = /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  return isIOS || isAndroid || isIPadOS;
}

/**
 * True for Safari and Safari-like WebKit browsers (desktop Safari, iOS Safari).
 * Excludes Chrome/Firefox/Edge on iOS (which also use WebKit but identify via
 * CriOS/FxiOS/EdgiOS tokens).
 */
export function isSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Android/i.test(ua)) return false;
  return /Safari/i.test(ua) && /AppleWebKit/i.test(ua);
}

export type BrowserBucket =
  | "desktop_chrome"
  | "desktop_safari"
  | "desktop_firefox"
  | "desktop_edge"
  | "ios_chrome"
  | "ios_safari"
  | "ios_firefox"
  | "ios_edge"
  | "google_app_ios"
  | "android_chrome"
  | "android_other"
  | "unknown";

/**
 * Classify the current browser for auth-strategy decisions and safe logging.
 * Order matters: iOS-specific tokens (CriOS/FxiOS/EdgiOS/GSA) must be checked
 * before generic Safari/Chrome detection.
 */
export function detectBrowserBucket(): BrowserBucket {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    if (/GSA\//.test(ua)) return "google_app_ios";
    if (/CriOS/.test(ua)) return "ios_chrome";
    if (/FxiOS/.test(ua)) return "ios_firefox";
    if (/EdgiOS/.test(ua)) return "ios_edge";
    if (/Safari/i.test(ua)) return "ios_safari";
    return "unknown";
  }
  if (isAndroid) {
    if (/Chrome/i.test(ua)) return "android_chrome";
    return "android_other";
  }
  if (/Edg\//.test(ua)) return "desktop_edge";
  if (/Firefox/i.test(ua)) return "desktop_firefox";
  if (/Chrome/i.test(ua)) return "desktop_chrome";
  if (/Safari/i.test(ua)) return "desktop_safari";
  return "unknown";
}

/**
 * iOS Chrome's popup/opener model is unreliable with Firebase popup auth.
 * Route only iOS Chrome through redirect; everything else uses popup first.
 */
export function prefersRedirectStrategy(
  bucket: BrowserBucket = detectBrowserBucket(),
): boolean {
  return bucket === "ios_chrome";
}


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
