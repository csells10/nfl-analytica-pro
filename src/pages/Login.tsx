import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Login() {
  const { signInWithGoogle, isLoading, user, isReady, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const runtimeLocation = {
    hostname: window.location.hostname,
    origin: window.location.origin,
  };

  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/";

  useEffect(() => {
    console.info("[auth-debug] window.location.hostname:", runtimeLocation.hostname);
    console.info("[auth-debug] window.location.origin:", runtimeLocation.origin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReady && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isReady, user, navigate, redirectTo]);

  const handleGoogleSignIn = async () => {
    console.info("[auth-debug] sign-in click hostname:", window.location.hostname);
    console.info("[auth-debug] sign-in click origin:", window.location.origin);
    try {
      await signInWithGoogle();
    } catch {
      /* error surfaced via authError */
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="items-center space-y-3 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">GameLens</h1>
            <p className="text-xs tracking-wide text-muted-foreground">Matchup Intelligence</p>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            {isLoading ? "Signing in…" : "Sign in with Google"}
          </Button>
          {authError && (
            <p className="mt-3 text-center text-sm text-destructive">{authError}</p>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Access is restricted to authorized accounts.
          </p>
          <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Auth debug</p>
            <p className="mt-1 break-all">hostname: {runtimeLocation.hostname}</p>
            <p className="mt-1 break-all">origin: {runtimeLocation.origin}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
