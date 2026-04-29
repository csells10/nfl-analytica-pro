import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
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
  /** True once the initial auth-state check has completed. */
  isReady: boolean;
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
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const start = perfNow();
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
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
      // Authorization is now enforced by the backend (Firestore allowlist).
      // If this account isn't authorized, API calls will return 401/403 and
      // the API layer will sign the user out with a clear message.
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User dismissed the popup — not an error worth surfacing.
        setAuthError(null);
      } else if (!authError) {
        setAuthError((err as Error).message || "Sign-in failed.");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [authError]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isReady, authError, signInWithGoogle, signOut }}
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
