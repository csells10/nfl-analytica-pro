import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { firebaseAuth, googleProvider, isMobileBrowser } from "@/lib/firebase";
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
  /** True once the initial auth-state check has completed. */
  isReady: boolean;
  /** True from the moment the user taps sign-in until it resolves (or the page redirects). */
  isSigningIn: boolean;
  /** Error from the most recent sign-in attempt (e.g. not allowlisted). */
  authError: string | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const start = perfNow();
    let cancelled = false;

    // Ensure session persists across the redirect round-trip (iOS Chrome
    // in particular needs explicit local persistence) and complete any
    // pending redirect sign-in from a previous navigation.
    void (async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        await getRedirectResult(firebaseAuth);
      } catch (err) {
        const code = (err as { code?: string }).code;
        const message = (err as { message?: string }).message;
        // eslint-disable-next-line no-console
        console.error("[auth] redirect result", code, message);
        if (!cancelled) {
          setAuthError("Google sign-in could not finish. Please try again.");
        }
      }
    })();

    const unsub = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser) {
        setUser(toUser(fbUser));
        setAuthError(null);
      } else {
        setUser(null);
      }
      if (!isReady) {
        setIsReady(true);
        perfTime("auth restore", start);
      }
      // Resolve any in-flight sign-in flag once auth state lands.
      setIsSigningIn(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setIsLoading(true);
    setAuthError(null);

    const mobile = isMobileBrowser();
    try {
      if (mobile) {
        // Page will navigate away; do NOT clear isSigningIn here.
        await signInWithRedirect(firebaseAuth, googleProvider);
        return;
      }
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      const message = (err as { message?: string }).message;
      // eslint-disable-next-line no-console
      console.error("[auth]", code, message);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setAuthError(null);
      } else {
        setAuthError("Sign-in failed. Please try again.");
      }
      setIsSigningIn(false);
      throw err;
    } finally {
      setIsLoading(false);
      // For the redirect path we already returned above; for popup we reset here.
      if (!mobile) setIsSigningIn(false);
    }
  }, [isSigningIn]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isReady, isSigningIn, authError, signInWithGoogle, signOut }}
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
