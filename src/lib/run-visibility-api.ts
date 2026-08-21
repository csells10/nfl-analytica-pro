/**
 * Low-level transport for the protected, development-only GameLens
 * Run Visibility endpoint.
 *
 *   GET /admin/gamelens/run-visibility
 *
 * This module owns three things and nothing else:
 *   1. the dedicated development base URL (never the shared production one),
 *   2. query-parameter serialization,
 *   3. Firebase-authenticated fetch + safe error mapping.
 *
 * The shared public API base in `@/lib/nfl-api` is intentionally untouched:
 * /games, /game, /me and Claim Health keep pointing at production.
 */

import { getAuthToken } from "@/lib/firebase";
import type { RunVisibilityApiParams } from "@/lib/run-visibility";

/**
 * Development-only Cloud Run service, confirmed from Google Cloud.
 * Used solely by the Run Visibility adapter.
 */
export const RUN_VISIBILITY_API_BASE = "https://nfl-games-app-dev-ids7lwjjta-uc.a.run.app";

export const RUN_VISIBILITY_PATH = "/admin/gamelens/run-visibility";

export type RunVisibilityErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "source_unavailable"
  | "invalid_request"
  | "week_not_found"
  | "game_not_found"
  | "server"
  | "network"
  | "invalid_response"
  | "range_too_large";

/** Failure boundary. Diagnostic only; never changes behavior. */
export type RunVisibilityPhase = "token" | "network" | "response" | "normalization";

export class RunVisibilityError extends Error {
  readonly kind: RunVisibilityErrorKind;
  readonly status?: number;
  /** Backend error code, e.g. "development_source_unavailable". */
  readonly code?: string;
  /** Safe backend copy, only populated for request-shape (400) problems. */
  backendMessage?: string;
  /** Where the failure happened. */
  phase?: RunVisibilityPhase;
  /** Path + query string only. Never a header, credential or token. */
  requestPath?: string;
  /**
   * True only as proof that a non-empty bearer token was attached to the
   * request. It is never proof that the token was valid or accepted.
   */
  authAttached?: boolean;
  /** Field name that failed normalization. Never a response body value. */
  field?: string;

  constructor(kind: RunVisibilityErrorKind, message: string, status?: number, code?: string) {
    super(message);
    this.name = "RunVisibilityError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}


/**
 * Serializes request parameters, omitting optional values that are blank.
 * Required parameters are always sent.
 */
export function buildRunVisibilityQuery(params: RunVisibilityApiParams): URLSearchParams {
  const search = new URLSearchParams();
  search.set("season", params.season);
  search.set("season_type", params.season_type);
  search.set("learning_run_id", params.learning_run_id);
  search.set("start_date", params.start_date);
  search.set("end_date", params.end_date);

  if (params.game_week) search.set("game_week", params.game_week);
  if (params.game_id) search.set("game_id", params.game_id);
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    search.set("limit", String(params.limit));
  }

  return search;
}

/** Path + query string only — safe to display. */
export function runVisibilityPath(params: RunVisibilityApiParams): string {
  return `${RUN_VISIBILITY_PATH}?${buildRunVisibilityQuery(params).toString()}`;
}

export function runVisibilityUrl(params: RunVisibilityApiParams): string {
  return `${RUN_VISIBILITY_API_BASE}${runVisibilityPath(params)}`;
}

const CODE_TO_KIND: Record<string, RunVisibilityErrorKind> = {
  invalid_run_visibility_request: "invalid_request",
  unauthorized: "unauthenticated",
  forbidden: "forbidden",
  development_source_unavailable: "source_unavailable",
  game_week_not_found: "week_not_found",
  game_not_found: "game_not_found",
  run_visibility_query_failed: "server",
};

const SAFE_MESSAGE: Record<RunVisibilityErrorKind, string> = {
  unauthenticated: "Your session has expired. Sign in again to continue.",
  forbidden: "Admin access is required for Run Visibility.",
  source_unavailable: "Development Run Visibility evidence is currently unavailable.",
  invalid_request: "The current filter selection was rejected by the endpoint.",
  week_not_found: "That week is not available in the selected range.",
  game_not_found: "That game is no longer available in this range.",
  server: "Run Visibility could not read evidence right now.",
  network: "Could not reach the development Run Visibility service.",
  invalid_response: "Run Visibility returned a response the app could not read.",
  range_too_large: "Select a range of 31 days or fewer.",
};

export function safeErrorMessage(error: unknown): string {
  if (error instanceof RunVisibilityError) {
    return error.backendMessage ?? SAFE_MESSAGE[error.kind];
  }
  return "Something went wrong reading Run Visibility.";
}

/** Build marker so a stale bundle is obvious at a glance. */
export const RUN_VISIBILITY_DIAGNOSTIC_MARKER = "dx1";

/** Constructor name only — never a message, body or stack. */
function safeErrorName(error: unknown): string {
  if (error instanceof Error) return error.name || error.constructor.name;
  if (typeof error === "object" && error !== null) return error.constructor?.name ?? "object";
  return typeof error;
}

/**
 * One-line, secret-free failure summary for the admin error panel.
 *
 * Always returns a line. Contains only: the build marker, phase, HTTP status,
 * backend error code, whether a non-empty bearer token was attached, the
 * failing field name, and the request path with its query string.
 * Never a token, header, response body or stack trace.
 */
export function safeDiagnostic(error: unknown): string {
  const parts: string[] = [RUN_VISIBILITY_DIAGNOSTIC_MARKER];

  if (error instanceof RunVisibilityError) {
    if (error.phase) parts.push(`phase: ${error.phase}`);
    if (typeof error.status === "number") parts.push(`status: ${error.status}`);
    if (error.code) parts.push(`code: ${error.code}`);
    if (typeof error.authAttached === "boolean") parts.push(`auth: ${error.authAttached}`);
    if (error.field) parts.push(`field: ${error.field}`);
    if (error.requestPath) parts.push(error.requestPath);
  }

  if (parts.length === 1) {
    parts.push("phase: unknown", `error: ${safeErrorName(error)}`, "no diagnostic fields");
  }

  return parts.join(" · ");
}



// Backend-supplied human message, only used for 400s where it is safe copy.
export interface RunVisibilityErrorBody {

  error?: string;
  code?: string;
  message?: string;
  detail?: string;
}

function parseErrorBody(text: string): RunVisibilityErrorBody {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as RunVisibilityErrorBody) : {};
  } catch {
    return {};
  }
}

function kindForResponse(status: number, body: RunVisibilityErrorBody): RunVisibilityErrorKind {
  const code = body.code ?? body.error;
  if (code && CODE_TO_KIND[code]) return CODE_TO_KIND[code];
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 400) return "invalid_request";
  if (status === 404) return "game_not_found";
  if (status >= 500) return "server";
  return "server";
}

/**
 * Authenticated GET. Never falls back to mock data and never retries against
 * the production API base.
 */
export async function requestRunVisibility(params: RunVisibilityApiParams): Promise<unknown> {
  const path = runVisibilityPath(params);
  const token = await getAuthToken();
  if (!token) {
    // Local failure: no token was ever attached, so no backend status exists.
    const error = new RunVisibilityError("unauthenticated", SAFE_MESSAGE.unauthenticated);
    error.phase = "token";
    error.requestPath = path;
    error.authAttached = false;
    throw error;
  }

  let res: Response;
  try {
    res = await fetch(runVisibilityUrl(params), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch {
    const error = new RunVisibilityError("network", SAFE_MESSAGE.network);
    error.phase = "network";
    error.requestPath = path;
    error.authAttached = true;
    throw error;
  }

  if (!res.ok) {
    const body = parseErrorBody(await res.text().catch(() => ""));
    const kind = kindForResponse(res.status, body);
    const error = new RunVisibilityError(kind, SAFE_MESSAGE[kind], res.status, body.code ?? body.error);
    // Only surface backend copy for request-shape problems; never for 5xx.
    if (kind === "invalid_request" && typeof body.message === "string") {
      error.backendMessage = body.message;
    }
    // A 401 here came from the backend: a token was attached but not accepted.
    error.phase = "response";
    error.requestPath = path;
    error.authAttached = true;
    throw error;
  }

  try {
    return (await res.json()) as unknown;
  } catch {
    const error = new RunVisibilityError("invalid_response", SAFE_MESSAGE.invalid_response, res.status);
    error.phase = "response";
    error.requestPath = path;
    error.authAttached = true;
    throw error;
  }
}

