/**
 * Read-only auth diagnostics, gated by ?debug=1.
 *
 * Source of truth is sessionStorage so events survive the
 * gamelens.io → auth.gamelens.io → gamelens.io redirect round-trip.
 *
 * Strict allowlist of field names — never logs tokens, emails, UIDs,
 * display names, photos, full URLs, or full query strings.
 */

const ENABLED_KEY = "gamelens.auth.debug";
const EVENTS_KEY = "gamelens.auth.debug.events";
const MOUNT_COUNT_KEY = "gamelens.auth.debug.mountCount";
const MAX_EVENTS = 100;

const ALLOWED_FIELDS = new Set<string>([
  "event",
  "t",
  "elapsedMs",
  "browserBucket",
  "selectedStrategy",
  "pendingRedirect",
  "hasSessionStorage",
  "hrefHost",
  "hrefPath",
  "referrerHost",
  "hasCode",
  "hasState",
  "hasError",
  "setPersistenceOk",
  "redirectResultStatus",
  "hasUser",
  "currentUserPresent",
  "watchdogFired",
  "meCalled",
  "meStatus",
  "errorCode",
  "authProviderMountCount",
  "firebaseSdkVersion",
  "phase",
  "persistenceStatus",
  // --- Expanded auth-path diagnostics (debug=1 only) ---
  "platform",
  "cookieEnabled",
  "onLine",
  "hasLocalStorage",
  "hasIndexedDB",
  "isSecureContext",
  "protocol",
  "visibilityState",
  "tzOffsetMin",
  "storageSessionProbe",
  "storageLocalProbe",
  "storageIndexedDbProbe",
  "indexedDbOpenProbe",
  "authDomain",
  "projectId",
  "appLabel",
  "firebaseAuthPresent",
  "initializeAuthUsed",
  "fallbackToGetAuth",
  "onAuthStateChangedCount",
  "watchdogStarted",
  "watchdogCleared",
  "loginMounted",
  "routePath",
  "isReady",
  "isSigningIn",
]);

// Word-boundaried so safe fields like "appLabel" / "projectId" aren't caught by "name"/"key".
const DENY_PATTERN = /\b(token|email|uid|displayname|photo|provider|credential|secret|href|referrer)\b/i;

export type DebugFieldValue = string | number | boolean | null;
export type DebugEvent = { t: number; event: string } & Record<string, DebugFieldValue>;

function hasSessionStorage(): boolean {
  try {
    return typeof sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

export function isAuthDebugEnabled(): boolean {
  if (!hasSessionStorage()) return false;
  try {
    if (typeof location !== "undefined" && /[?&]debug=1\b/.test(location.search)) {
      sessionStorage.setItem(ENABLED_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function readEvents(): DebugEvent[] {
  if (!hasSessionStorage()) return [];
  try {
    const raw = sessionStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DebugEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: DebugEvent[]): void {
  if (!hasSessionStorage()) return;
  try {
    const capped = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;
    sessionStorage.setItem(EVENTS_KEY, JSON.stringify(capped));
  } catch {
    /* quota / serialization — ignore */
  }
}

export function getAuthDebugEvents(): DebugEvent[] {
  return readEvents();
}

export function recordAuthDebug(
  event: string,
  fields?: Record<string, DebugFieldValue | undefined>,
): void {
  if (!isAuthDebugEnabled()) return;

  const sanitized: Record<string, DebugFieldValue> = {};
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      if (!ALLOWED_FIELDS.has(k)) continue;
      if (DENY_PATTERN.test(k)) continue;
      if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean" && v !== null) continue;
      sanitized[k] = v;
    }
  }

  const entry: DebugEvent = { t: Date.now(), event, ...sanitized };
  const events = readEvents();
  events.push(entry);
  writeEvents(events);

  // eslint-disable-next-line no-console
  console.log("[auth-debug]", event, sanitized);
}

export function incrementMountCount(): number {
  if (!hasSessionStorage()) return 0;
  try {
    const current = parseInt(sessionStorage.getItem(MOUNT_COUNT_KEY) ?? "0", 10) || 0;
    const next = current + 1;
    sessionStorage.setItem(MOUNT_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function clearAuthDebug(): void {
  if (!hasSessionStorage()) return;
  try {
    sessionStorage.removeItem(EVENTS_KEY);
    sessionStorage.removeItem(MOUNT_COUNT_KEY);
    // Intentionally preserve:
    //   - ENABLED_KEY (debug stays on)
    //   - gamelens.auth.pendingRedirect (auth flow state)
    //   - Firebase IndexedDB / user session
  } catch {
    /* ignore */
  }
}

/**
 * Extract host/path booleans from a URL without logging any full URL or
 * query string values.
 */
export function safeUrlFields(href: string | null | undefined, referrer: string | null | undefined) {
  const out: {
    hrefHost: string | null;
    hrefPath: string | null;
    referrerHost: string | null;
    hasCode: boolean;
    hasState: boolean;
    hasError: boolean;
  } = {
    hrefHost: null,
    hrefPath: null,
    referrerHost: null,
    hasCode: false,
    hasState: false,
    hasError: false,
  };

  if (href) {
    try {
      const u = new URL(href);
      out.hrefHost = u.host;
      out.hrefPath = u.pathname;
      out.hasCode = u.searchParams.has("code");
      out.hasState = u.searchParams.has("state");
      out.hasError = u.searchParams.has("error");
    } catch {
      /* ignore */
    }
  }
  if (referrer) {
    try {
      const u = new URL(referrer);
      out.referrerHost = u.host;
    } catch {
      /* ignore */
    }
  }
  return out;
}
