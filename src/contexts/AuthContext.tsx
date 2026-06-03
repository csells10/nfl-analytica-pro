import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  firebaseAuth,
  googleProvider,
  detectBrowserBucket,
  prefersRedirectStrategy,
  type BrowserBucket,
} from "@/lib/firebase";
import { perfNow, perfTime } from "@/lib/perf";
import { SDK_VERSION as FIREBASE_SDK_VERSION } from "firebase/app";
import {
  incrementMountCount,
  isAuthDebugEnabled,
  recordAuthDebug,
  safeUrlFields,
} from "@/lib/auth-debug";

interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string | null;
}

type AuthStrategy = "popup" | "redirect" | "fallback_redirect";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /** True once Firebase has finished both redirect-result processing and the first auth-state event. */
  isReady: boolean;
  /** True from the moment the user taps sign-in until it resolves (or the page redirects). */
  isSigningIn: boolean;
  /** Error from the most recent sign-in attempt. */
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_REDIRECT_KEY = "gamelens.auth.pendingRedirect";
const REDIRECT_WATCHDOG_MS = 10_000;

function toUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? "",
    name: fbUser.displayName ?? (fbUser.email ?? "").split("@")[0],
    photoURL: fbUser.photoURL,
  };
}

function safeLog(
  label: string,
  bucket: BrowserBucket,
  strategy: AuthStrategy | "none",
  err?: unknown,
) {
  const code = err ? (err as { code?: string }).code : undefined;
  const message = err ? (err as { message?: string }).message : undefined;
  // eslint-disable-next-line no-console
  console.log(
    `[auth] ${label} bucket=${bucket} strategy=${strategy}` +
      (code ? ` code=${code}` : "") +
      (message ? ` message=${message}` : ""),
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);
  const [firstAuthEventReceived, setFirstAuthEventReceived] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const startRef = useRef(perfNow());
  const bucketRef = useRef<BrowserBucket>(detectBrowserBucket());

  const isReady = redirectChecked && firstAuthEventReceived;

  useEffect(() => {
    let cancelled = false;
    const bucket = bucketRef.current;

    // Detect whether we're returning from a redirect. We persist a flag before
    // calling signInWithRedirect so we can arm a watchdog on the next page load.
    const pendingRedirect =
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(PENDING_REDIRECT_KEY) === "1";

    // eslint-disable-next-line no-console
    console.log(
      `[auth] mount bucket=${bucket} pendingRedirect=${pendingRedirect} ua=${
        typeof navigator !== "undefined" ? navigator.userAgent : "n/a"
      }`,
    );

    if (pendingRedirect) {
      setIsSigningIn(true);
    }

    // Watchdog: if a redirect was pending and we still haven't received an
    // authed user within REDIRECT_WATCHDOG_MS, surface a clear error instead
    // of spinning forever. No automatic retry.
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    if (pendingRedirect) {
      watchdog = setTimeout(() => {
        if (cancelled) return;
        if (!firebaseAuth.currentUser) {
          safeLog("redirect watchdog timeout", bucket, "redirect");
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(PENDING_REDIRECT_KEY);
          }
          setAuthError(
            "Google sign-in didn't complete. Please tap Sign in with Google to try again.",
          );
          setIsSigningIn(false);
          setRedirectChecked(true);
          setFirstAuthEventReceived(true);
        }
      }, REDIRECT_WATCHDOG_MS);
    }

    void (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch (err) {
        safeLog("setPersistence failed", bucket, "none", err);
      }

      try {
        const result = await getRedirectResult(firebaseAuth);
        if (cancelled) return;
        if (result?.user) {
          safeLog("redirect result restored", bucket, "redirect");
        } else if (pendingRedirect) {
          // Redirect was expected but result is null — likely storage/ITP issue.
          safeLog("redirect result null", bucket, "redirect");
          setAuthError(
            "Google sign-in didn't complete. Please tap Sign in with Google to try again.",
          );
          setIsSigningIn(false);
        }
      } catch (err) {
        safeLog("getRedirectResult error", bucket, "redirect", err);
        if (!cancelled) {
          setAuthError(
            "Google sign-in could not finish. Please tap Sign in with Google to try again.",
          );
          setIsSigningIn(false);
        }
      } finally {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(PENDING_REDIRECT_KEY);
        }
        if (!cancelled) setRedirectChecked(true);
      }
    })();

    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser) {
        setUser(toUser(fbUser));
        setAuthError(null);
        setIsSigningIn(false);
        if (watchdog) {
          clearTimeout(watchdog);
          watchdog = null;
        }
      } else {
        setUser(null);
      }
      if (!firstAuthEventReceived) {
        setFirstAuthEventReceived(true);
        perfTime("auth restore", startRef.current);
      }
    });

    return () => {
      cancelled = true;
      if (watchdog) clearTimeout(watchdog);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async () => {
    if (isSigningIn) return;
    const bucket = bucketRef.current;
    setIsSigningIn(true);
    setIsLoading(true);
    setAuthError(null);

    // Persistence must be set before kicking off any auth flow so the session
    // survives the redirect round-trip.
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
    } catch (err) {
      safeLog("setPersistence (pre-signin) failed", bucket, "none", err);
    }

    // iOS Chrome (CriOS): popup is structurally unreliable — go straight to
    // redirect. Every other browser tries popup first.
    if (prefersRedirectStrategy(bucket)) {
      safeLog("start", bucket, "redirect");
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(PENDING_REDIRECT_KEY, "1");
        }
        await signInWithRedirect(firebaseAuth, googleProvider);
        // Page is navigating away — keep isSigningIn=true until unload.
      } catch (err) {
        safeLog("signInWithRedirect error", bucket, "redirect", err);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(PENDING_REDIRECT_KEY);
        }
        setAuthError("Sign-in failed. Please try again.");
        setIsSigningIn(false);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    safeLog("start", bucket, "popup");
    let willRedirect = false;
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        safeLog("popup dismissed", bucket, "popup", err);
        setIsSigningIn(false);
      } else if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        safeLog("popup unavailable, falling back", bucket, "fallback_redirect", err);
        willRedirect = true;
        try {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(PENDING_REDIRECT_KEY, "1");
          }
          await signInWithRedirect(firebaseAuth, googleProvider);
        } catch (redirectErr) {
          safeLog("fallback redirect error", bucket, "fallback_redirect", redirectErr);
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(PENDING_REDIRECT_KEY);
          }
          setAuthError("Sign-in failed. Please try again.");
          setIsSigningIn(false);
          willRedirect = false;
        }
      } else {
        safeLog("popup error", bucket, "popup", err);
        setAuthError("Sign-in failed. Please try again.");
        setIsSigningIn(false);
      }
    } finally {
      setIsLoading(false);
      void willRedirect;
    }
  }, [isSigningIn]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isReady,
        isSigningIn,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
