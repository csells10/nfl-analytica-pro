import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import gamelensHorizontalLight from "@/assets/gamelens-horizontal-light.png";
import gamelensHorizontalDark from "@/assets/gamelens-horizontal-dark.png";
import { detectBrowserBucket, GOOGLE_WEB_CLIENT_ID } from "@/lib/firebase";
import {
  cancelGis,
  initializeGis,
  loadGisScript,
  renderGoogleButton,
} from "@/lib/gis";
import {
  clearAuthDebug,
  getAuthDebugEvents,
  isAuthDebugEnabled,
  recordAuthDebug,
  subscribeAuthDebug,
  type DebugEvent,
} from "@/lib/auth-debug";

export default function Login() {
  const {
    signInWithGoogle,
    signInWithGoogleCredential,
    isLoading,
    isSigningIn,
    user,
    isReady,
    authError,
    clearAuthError,
  } = useAuth();
  const busy = isLoading || isSigningIn;
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/";

  // iPhone Chrome (CriOS) only: render the official Google Identity
  // Services button and exchange the returned ID token via
  // signInWithCredential. Avoids /__/auth/handler entirely.
  const [bucket] = useState(() => detectBrowserBucket());
  const useGis = bucket === "ios_chrome";
  const gisContainerRef = useRef<HTMLDivElement | null>(null);
  const [gisFailed, setGisFailed] = useState(false);

  // Debug-only: record that the login page mounted (path + ready state only).
  useEffect(() => {
    if (!isAuthDebugEnabled()) return;
    recordAuthDebug("loginPage:mount", {
      phase: "login_mounted",
      loginMounted: true,
      routePath: location.pathname,
      isReady,
      isSigningIn,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReady && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isReady, user, navigate, redirectTo]);

  // Mount the GIS button only on iPhone Chrome. Falls back to today's
  // redirect button on any load/init failure.
  useEffect(() => {
    if (!useGis) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadGisScript();
        if (cancelled) return;
        const container = gisContainerRef.current;
        if (!container) return;

        let initOk = true;
        initializeGis({
          clientId: GOOGLE_WEB_CLIENT_ID,
          onCredential: (idToken) => {
            void signInWithGoogleCredential(idToken);
          },
          onError: (reason) => {
            recordAuthDebug("gis:promptSkipped", { errorCode: reason });
            initOk = false;
            if (!cancelled) setGisFailed(true);
          },
        });
        if (!initOk || cancelled) return;

        // Match container width so the GIS button visually replaces our
        // existing full-width Sign in with Google button.
        const width = Math.min(
          400,
          Math.max(200, Math.round(container.getBoundingClientRect().width)),
        );
        const isDark =
          typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark");
        renderGoogleButton(container, {
          theme: isDark ? "filled_black" : "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
      } catch (err) {
        const code = (err as { message?: string }).message ?? "load_error";
        recordAuthDebug("gis:promptSkipped", { errorCode: code });
        if (!cancelled) setGisFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelGis();
    };
  }, [useGis, signInWithGoogleCredential]);

  const handleGoogleSignIn = async () => {
    clearAuthError();
    try {
      await signInWithGoogle();
    } catch {
      /* error surfaced via authError */
    }
  };

  const showFallbackButton = !useGis || gisFailed;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col">
        <Card className="w-full border-border bg-card">
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
            {useGis && (
              <div
                ref={gisContainerRef}
                className="flex w-full justify-center"
                aria-label="Sign in with Google"
              />
            )}
            {showFallbackButton && (
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className={useGis ? "mt-3 w-full" : "w-full"}
                variant="outline"
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                {busy ? "Signing in…" : "Sign in with Google"}
              </Button>
            )}
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
    </div>
  );
}

function buildPayload(events: DebugEvent[]) {
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
  pickLast("env:snapshot", [
    "platform",
    "cookieEnabled",
    "onLine",
    "hasLocalStorage",
    "hasIndexedDB",
    "isSecureContext",
    "protocol",
    "visibilityState",
    "tzOffsetMin",
  ]);
  pickLast("storage:probe", [
    "storageSessionProbe",
    "storageLocalProbe",
    "storageIndexedDbProbe",
    "indexedDbOpenProbe",
  ]);
  pickLast("firebase:instance", [
    "firebaseAuthPresent",
    "authDomain",
    "projectId",
    "appLabel",
    "initializeAuthUsed",
    "currentUserPresent",
  ]);
  // fallbackToGetAuth derived from presence of initializeAuth:fallback event.
  const sawFallback = events.some((e) => e.event === "initializeAuth:fallback");
  summary["firebase:instance.fallbackToGetAuth"] = String(sawFallback);

  pickLast("pendingRedirect:onMount", ["pendingRedirect"]);
  pickLast("signIn:redirectDispatched", ["pendingRedirect"]);
  pickLast("pendingRedirect:cleared", ["pendingRedirect"]);
  pickLast("getRedirectResult:start", ["phase", "currentUserPresent"]);
  pickLast("getRedirectResult:end", [
    "redirectResultStatus",
    "hasUser",
    "currentUserPresent",
    "elapsedMs",
    "errorCode",
  ]);
  pickLast("currentUserAfterDrain", ["currentUserPresent"]);
  pickLast("onAuthStateChanged:subscribed", ["phase"]);
  pickLast("onAuthStateChanged:first", ["hasUser", "elapsedMs"]);
  pickLast("onAuthStateChanged:tick", ["onAuthStateChangedCount", "hasUser"]);
  pickLast("watchdog:started", ["watchdogStarted"]);
  pickLast("watchdog:cleared", ["watchdogCleared"]);
  pickLast("watchdog:fired", ["watchdogFired", "phase", "elapsedMs"]);
  pickLast("signIn:start", ["selectedStrategy", "browserBucket"]);
  pickLast("loginPage:mount", ["routePath", "isReady"]);

  for (let i = events.length - 1; i >= 0; i--) {
    const p = events[i].phase;
    if (typeof p === "string") {
      summary["latestPhase"] = p;
      break;
    }
  }

  return {
    summary,
    events,
    capturedAt: new Date().toISOString(),
  };
}

function AuthDebugPanel() {
  const [enabled] = useState(() => isAuthDebugEnabled());
  const [events, setEvents] = useState<DebugEvent[]>(() =>
    isAuthDebugEnabled() ? getAuthDebugEvents() : [],
  );
  const [copyStatus, setCopyStatus] = useState<string>("");
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    return subscribeAuthDebug(setEvents);
  }, [enabled]);

  if (!enabled) return null;

  const payload = buildPayload(events);
  const payloadJson = JSON.stringify(payload, null, 2);
  const { summary } = payload;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payloadJson);
        setCopyStatus("Copied ✓");
        setShowFallback(false);
        setTimeout(() => setCopyStatus(""), 2500);
        return;
      }
    } catch {
      /* fall through to legacy / fallback */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = payloadJson;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        setCopyStatus("Copied ✓");
        setShowFallback(false);
        setTimeout(() => setCopyStatus(""), 2500);
        return;
      }
    } catch {
      /* ignore */
    }
    setCopyStatus("Copy blocked — use the box below");
    setShowFallback(true);
    setTimeout(() => setCopyStatus(""), 3500);
  };

  const handleClear = () => {
    clearAuthDebug();
    setEvents([]);
    setShowFallback(false);
    setCopyStatus("Cleared");
    setTimeout(() => setCopyStatus(""), 1500);
  };

  return (
    <Card className="mt-4 w-full border-border bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Auth diagnostics (debug=1)
          </p>
          <span className="text-[10px] text-muted-foreground">{events.length}/100</span>
        </div>

        {/* Copy button stays at the top — no disclosure required. */}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="default" className="flex-1" onClick={handleCopy}>
            Copy diagnostics
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
        {copyStatus && (
          <p className="text-center text-[11px] text-muted-foreground">{copyStatus}</p>
        )}

        {showFallback && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Long-press the box → Select All → Copy.
            </p>
            <Textarea
              readOnly
              value={payloadJson}
              onFocus={(e) => e.currentTarget.select()}
              className="h-40 font-mono text-[10px]"
            />
          </div>
        )}

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
