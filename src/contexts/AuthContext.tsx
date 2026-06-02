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
import { firebaseAuth, googleProvider } from "@/lib/firebase";
import { perfNow, perfTime } from "@/lib/perf";

interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string | null;
}

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

function toUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? "",
    name: fbUser.displayName ?? (fbUser.email ?? "").split("@")[0],
    photoURL: fbUser.photoURL,
  };
}

function safeLog(label: string, err: unknown) {
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message;
  // eslint-disable-next-line no-console
  console.error("[auth]", label, code, message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);
  const [firstAuthEventReceived, setFirstAuthEventReceived] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const startRef = useRef(perfNow());

  const isReady = redirectChecked && firstAuthEventReceived;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // 1. Ensure session persists across the redirect round-trip.
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch (err) {
        safeLog("setPersistence", err);
      }

      // 2. Drain any pending redirect result from a previous navigation.
      try {
        const result = await getRedirectResult(firebaseAuth);
        if (result?.user && !cancelled) {
          // eslint-disable-next-line no-console
          console.log("[auth] redirect result restored user");
        }
      } catch (err) {
        safeLog("getRedirectResult", err);
        if (!cancelled) {
          setAuthError("Google sign-in could not finish. Please try again.");
        }
      } finally {
        if (!cancelled) setRedirectChecked(true);
      }
    })();

    // 3. Subscribe to auth-state changes.
    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser) {
        setUser(toUser(fbUser));
        setAuthError(null);
      } else {
        setUser(null);
      }
      if (!firstAuthEventReceived) {
        setFirstAuthEventReceived(true);
        perfTime("auth restore", startRef.current);
      }
      setIsSigningIn(false);
    });

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setIsLoading(true);
    setAuthError(null);

    let willRedirect = false;
    try {
      // Popup-first for all browsers — works on modern iOS Safari + iOS Chrome
      // when triggered directly from a user tap. Fall back to redirect only
      // when the popup is structurally blocked.
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User dismissed — silent.
        setIsSigningIn(false);
      } else if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        // Popup unavailable — fall back to redirect. Page will navigate away;
        // keep isSigningIn=true so the button stays disabled until unload.
        willRedirect = true;
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
        } catch (redirectErr) {
          safeLog("signInWithRedirect", redirectErr);
          setAuthError("Sign-in failed. Please try again.");
          setIsSigningIn(false);
          willRedirect = false;
        }
      } else {
        safeLog("signInWithPopup", err);
        setAuthError("Sign-in failed. Please try again.");
        setIsSigningIn(false);
      }
    } finally {
      setIsLoading(false);
      // If we kicked off a redirect, keep isSigningIn=true until navigation.
      if (!willRedirect) {
        // signInWithPopup success path: onAuthStateChanged will clear isSigningIn.
      }
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
