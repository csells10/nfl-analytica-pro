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

export class RunVisibilityError extends Error {
  readonly kind: RunVisibilityErrorKind;
  readonly status?: number;
  /** Backend error code, e.g. "development_source_unavailable". */
  readonly code?: string;

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

export function runVisibilityUrl(params: RunVisibilityApiParams): string {
  return `${RUN_VISIBILITY_API_BASE}${RUN_VISIBILITY_PATH}?${buildRunVisibilityQuery(params).toString()}`;
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

// Backend-supplied human message, only used for 400s where it is safe copy.
export interface RunVisibilityErrorBody {

  error?: string;
  code?: string;
  message?: string;
  detail?: string;
}

// Augment the class with an optional backend message without widening the ctor.
export interface RunVisibilityError {
  backendMessage?: string;
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
  const token = await getAuthToken();
  if (!token) {
    throw new RunVisibilityError("unauthenticated", SAFE_MESSAGE.unauthenticated, 401, "unauthorized");
  }

  let res: Response;
  try {
    res = await fetch(runVisibilityUrl(params), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch {
    throw new RunVisibilityError("network", SAFE_MESSAGE.network);
  }

  if (!res.ok) {
    const body = parseErrorBody(await res.text().catch(() => ""));
    const kind = kindForResponse(res.status, body);
    const error = new RunVisibilityError(kind, SAFE_MESSAGE[kind], res.status, body.code ?? body.error);
    // Only surface backend copy for request-shape problems; never for 5xx.
    if (kind === "invalid_request" && typeof body.message === "string") {
      error.backendMessage = body.message;
    }
    throw error;
  }

  try {
    return (await res.json()) as unknown;
  } catch {
    throw new RunVisibilityError("invalid_response", SAFE_MESSAGE.invalid_response, res.status);
  }
}
