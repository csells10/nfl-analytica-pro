import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import gamelensHorizontalLight from "@/assets/gamelens-horizontal-light.png";
import gamelensHorizontalDark from "@/assets/gamelens-horizontal-dark.png";
import {
  clearAuthDebug,
  getAuthDebugEvents,
  isAuthDebugEnabled,
  type DebugEvent,
} from "@/lib/auth-debug";

export default function Login() {
  const { signInWithGoogle, isLoading, isSigningIn, user, isReady, authError, clearAuthError } = useAuth();
  const busy = isLoading || isSigningIn;
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/";

  useEffect(() => {
    if (isReady && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isReady, user, navigate, redirectTo]);

  const handleGoogleSignIn = async () => {
    clearAuthError();
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
          <h1 className="sr-only">GameLens</h1>
          <img src={gamelensHorizontalLight} alt="" aria-hidden="true" className="mx-auto h-16 w-auto dark:hidden" />
          <img src={gamelensHorizontalDark} alt="" aria-hidden="true" className="mx-auto hidden h-16 w-auto dark:block" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">NFL Matchup Intelligence</p>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full"
            variant="outline"
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            {busy ? "Signing in…" : "Sign in with Google"}
          </Button>
          {authError && (
            <p className="mt-3 text-center text-sm text-destructive">{authError}</p>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Access is restricted to authorized accounts.
          </p>
        </CardContent>
      </Card>
      <AuthDebugPanel />
    </div>
  );
}

function AuthDebugPanel() {
  const [enabled] = useState(() => isAuthDebugEnabled());
  const [events, setEvents] = useState<DebugEvent[]>(() =>
    isAuthDebugEnabled() ? getAuthDebugEvents() : [],
  );
  const [copyStatus, setCopyStatus] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setEvents(getAuthDebugEvents()), 500);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  // Derive a compact summary from the event list (last-occurrence wins).
  const summary: Record<string, string> = {};
  const pickLast = (event: string, fields: string[]) => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].event === event) {
        for (const f of fields) {
          const v = events[i][f];
          if (v !== undefined && v !== null) summary[`${event}.${f}`] = String(v);
        }
        return;
      }
    }
  };
  pickLast("mount", [
    "browserBucket",
    "pendingRedirect",
    "authProviderMountCount",
    "firebaseSdkVersion",
    "hrefHost",
    "hrefPath",
    "referrerHost",
    "hasCode",
    "hasState",
    "hasError",
  ]);
  pickLast("setPersistence:end", ["setPersistenceOk", "elapsedMs", "errorCode"]);
  pickLast("getRedirectResult:end", ["redirectResultStatus", "hasUser", "elapsedMs", "errorCode"]);
  pickLast("currentUserAfterDrain", ["currentUserPresent"]);
  pickLast("onAuthStateChanged:first", ["hasUser", "elapsedMs"]);
  pickLast("watchdog:fired", ["watchdogFired", "elapsedMs"]);
  pickLast("signIn:start", ["selectedStrategy"]);
  pickLast("me:called", ["meCalled"]);
  pickLast("me:result", ["meStatus"]);

  const handleCopy = async () => {
    const payload = JSON.stringify(
      { summary, events, capturedAt: new Date().toISOString() },
      null,
      2,
    );
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        setCopyStatus("Copied ✓");
      } else {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyStatus("Copied ✓");
      }
    } catch {
      setCopyStatus("Copy failed — long-press the box below");
    }
    setTimeout(() => setCopyStatus(""), 2500);
  };

  const handleClear = () => {
    clearAuthDebug();
    setEvents([]);
    setCopyStatus("Cleared");
    setTimeout(() => setCopyStatus(""), 1500);
  };

  return (
    <Card className="mt-4 w-full max-w-sm border-border bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Auth diagnostics (debug=1)
          </p>
          <span className="text-[10px] text-muted-foreground">{events.length}/100</span>
        </div>

        <div className="rounded border border-border bg-muted/40 p-2 font-mono text-[11px] leading-snug text-foreground">
          {Object.keys(summary).length === 0 ? (
            <p className="text-muted-foreground">No events yet. Tap Sign in with Google.</p>
          ) : (
            <ul className="space-y-0.5">
              {Object.entries(summary).map(([k, v]) => (
                <li key={k}>
                  <span className="text-muted-foreground">{k}:</span> {v}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={handleCopy}>
            Copy diagnostics
          </Button>
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={handleClear}>
            Clear
          </Button>
        </div>
        {copyStatus && (
          <p className="text-center text-[11px] text-muted-foreground">{copyStatus}</p>
        )}

        <details className="text-[11px]">
          <summary className="cursor-pointer text-muted-foreground">Full event log</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-[10px] leading-snug text-foreground">
{JSON.stringify(events, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
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
