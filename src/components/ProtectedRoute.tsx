import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMe } from "@/lib/admin-api";
import { ApiError } from "@/lib/nfl-api";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { recordAuthDebug } from "@/lib/auth-debug";

/**
 * Gates protected routes on:
 *   1. Firebase auth restoration (isReady)
 *   2. Backend /me access check (allowlist)
 *
 * While restoring we render an empty themed surface (no spinner) so the shell
 * appears instantly. We never redirect to /login before isReady — that's what
 * caused the Safari redirect loop.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady, signOut } = useAuth();
  const location = useLocation();

  // 1. Wait for Firebase to finish redirect + first auth event before deciding.
  if (!isReady) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  // 2. No user → send to login.
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // 3. User present → verify backend access.
  return (
    <AccessGate user={user} signOut={signOut}>
      {children}
    </AccessGate>
  );
}

function AccessGate({
  user,
  signOut,
  children,
}: {
  user: { email: string };
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const { data, error, isLoading } = useMe(true);

  // Diagnostic-only: observe the existing /me query — never trigger a new fetch.
  const meCalledLoggedRef = useRef(false);
  const meResultLoggedRef = useRef(false);
  useEffect(() => {
    if (!meCalledLoggedRef.current) {
      meCalledLoggedRef.current = true;
      recordAuthDebug("me:called", { meCalled: true });
    }
    if (!meResultLoggedRef.current) {
      if (data) {
        meResultLoggedRef.current = true;
        recordAuthDebug("me:result", { meStatus: "ok" });
      } else if (error instanceof ApiError) {
        meResultLoggedRef.current = true;
        recordAuthDebug("me:result", { meStatus: error.kind });
      } else if (error) {
        meResultLoggedRef.current = true;
        recordAuthDebug("me:result", { meStatus: "network-error" });
      }
    }
  }, [data, error, isLoading]);

  // 401 from backend → session is stale; sign out so the guard sends to /login.
  useEffect(() => {
    if (error instanceof ApiError && error.kind === "unauthenticated") {
      // eslint-disable-next-line no-console
      console.log("[auth] /me returned 401 — signing out");
      void signOut();
    }
  }, [error, signOut]);


  if (isLoading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.kind === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} is not authorized for GameLens. Contact an administrator if you
            believe this is a mistake.
          </p>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  // Network / server / unknown errors from /me shouldn't block the app — the
  // backend remains the source of truth for any sensitive route. Render
  // children and let downstream queries surface their own errors.
  return <>{children}</>;
}
