/**
 * Google Identity Services (GIS) helper — used only on iPhone Chrome (CriOS).
 *
 * Loads https://accounts.google.com/gsi/client dynamically on demand so that
 * non-iOS-Chrome buckets pay no cost. The loader is idempotent: a single
 * cached promise is shared across all callers, and exactly one <script> tag
 * is ever inserted.
 *
 * The credential returned via the callback is a Google ID token, which
 * AuthContext exchanges for a Firebase session via:
 *   GoogleAuthProvider.credential(idToken)
 *   signInWithCredential(firebaseAuth, credential)
 *
 * No interaction with /__/auth/handler, no signInWithRedirect, no
 * getRedirectResult on the GIS happy path.
 */

import { recordAuthDebug } from "@/lib/auth-debug";
import { perfNow } from "@/lib/perf";

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
  ux_mode?: "popup" | "redirect";
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfig {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const LOAD_TIMEOUT_MS = 6000;

let loadPromise: Promise<void> | null = null;

/**
 * Idempotently load the GIS client script. Resolves when window.google.accounts.id
 * is available; rejects on network error or 6s timeout.
 */
export function loadGisScript(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("no_window"));
      return;
    }

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const start = perfNow();
    recordAuthDebug("gis:loadStart", {});

    // If a tag already exists (e.g. StrictMode double-mount), reuse it.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );

    const onResolve = () => {
      if (window.google?.accounts?.id) {
        recordAuthDebug("gis:loadEnd", {
          elapsedMs: Math.round(perfNow() - start),
        });
        resolve();
      } else {
        recordAuthDebug("gis:loadEnd", {
          elapsedMs: Math.round(perfNow() - start),
          errorCode: "sdk_missing",
        });
        reject(new Error("sdk_missing"));
      }
    };

    const onError = (code: string) => {
      recordAuthDebug("gis:loadEnd", {
        elapsedMs: Math.round(perfNow() - start),
        errorCode: code,
      });
      // Allow a future retry after a hard failure.
      loadPromise = null;
      reject(new Error(code));
    };

    const timer = setTimeout(() => onError("load_timeout"), LOAD_TIMEOUT_MS);

    if (existing) {
      existing.addEventListener("load", () => {
        clearTimeout(timer);
        onResolve();
      });
      existing.addEventListener("error", () => {
        clearTimeout(timer);
        onError("load_error");
      });
      // If the existing tag has already loaded, the listeners above won't
      // fire. Probe the SDK on the next tick.
      setTimeout(() => {
        if (window.google?.accounts?.id) {
          clearTimeout(timer);
          onResolve();
        }
      }, 0);
      return;
    }

    const tag = document.createElement("script");
    tag.src = GIS_SRC;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => {
      clearTimeout(timer);
      onResolve();
    };
    tag.onerror = () => {
      clearTimeout(timer);
      onError("load_error");
    };
    document.head.appendChild(tag);
  });

  return loadPromise;
}

export interface InitializeGisOptions {
  clientId: string;
  onCredential: (idToken: string) => void;
  onError: (reason: string) => void;
}

/**
 * Calls google.accounts.id.initialize. Must be called after loadGisScript()
 * resolves. Idempotent at the GIS layer (re-initializing replaces config).
 */
export function initializeGis(opts: InitializeGisOptions): void {
  const gAccounts = window.google?.accounts?.id;
  if (!gAccounts) {
    opts.onError("sdk_missing");
    return;
  }
  try {
    gAccounts.initialize({
      client_id: opts.clientId,
      callback: (response) => {
        const idToken = response.credential;
        if (!idToken) {
          recordAuthDebug("gis:promptSkipped", { errorCode: "no_credential" });
          opts.onError("no_credential");
          return;
        }
        recordAuthDebug("gis:credentialReceived", {});
        opts.onCredential(idToken);
      },
      auto_select: false,
      itp_support: true,
      use_fedcm_for_prompt: true,
      ux_mode: "popup",
      cancel_on_tap_outside: true,
    });
    recordAuthDebug("gis:initialized", {});
  } catch (err) {
    const code = (err as { message?: string }).message ?? "init_error";
    opts.onError(code);
  }
}

/**
 * Render the official Google-rendered Sign in with Google button into the
 * given container. Caller owns the container element.
 */
export function renderGoogleButton(
  container: HTMLElement,
  options: GoogleButtonConfig = {},
): void {
  const gAccounts = window.google?.accounts?.id;
  if (!gAccounts) return;
  gAccounts.renderButton(container, {
    type: "standard",
    theme: options.theme ?? "outline",
    size: options.size ?? "large",
    text: options.text ?? "signin_with",
    shape: options.shape ?? "rectangular",
    logo_alignment: options.logo_alignment ?? "left",
    width: options.width,
  });
  recordAuthDebug("gis:buttonRendered", {});
}

/**
 * Cancel any pending GIS prompt. Safe to call when the SDK isn't loaded.
 */
export function cancelGis(): void {
  try {
    window.google?.accounts?.id?.cancel();
  } catch {
    /* best-effort */
  }
}
