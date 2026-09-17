// Live Matchup Lens evidence: authenticated request, query wiring and the
// safe state machine the page renders from.
//
// Auth reuses the shared Firebase bearer mechanism in `nfl-api.ts`; no second
// auth client and no Matchup-Lens-specific token handling. No token value is
// ever logged, persisted or returned from this module.

import { useQuery } from "@tanstack/react-query";
import { API_BASE, ApiError, authHeaders, handleLensApiResponse } from "./nfl-api";
import {
  adaptMatchupLensV1,
  MatchupLensContractError,
  type AdaptedMatchupLensContext,
} from "./matchup-lens-adapter";
import {
  MATCHUP_LENS_SCHEMA_VERSION,
  type MatchupLensV1Response,
} from "./matchup-lens-api-types";

/** Structural game-ID shape, e.g. 20260917_DET@BUF. */
export const GAME_ID_PATTERN = /^[0-9]{8}_[A-Z0-9]{2,4}@[A-Z0-9]{2,4}$/;
const MAX_GAME_ID_LENGTH = 32;

export type GameIdState =
  | { kind: "missing" }
  | { kind: "malformed" }
  | { kind: "valid"; gameId: string };

/** Classify the `game` search parameter without ever normalising it away. */
export function classifyGameId(raw: string | null | undefined): GameIdState {
  if (raw === null || raw === undefined || raw.trim() === "") return { kind: "missing" };
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return { kind: "malformed" };
  }
  if (decoded.length > MAX_GAME_ID_LENGTH) return { kind: "malformed" };
  if (!GAME_ID_PATTERN.test(decoded)) return { kind: "malformed" };
  return { kind: "valid", gameId: decoded };
}

/** Result of a successful HTTP call: either adapted evidence or a safe reason. */
export type MatchupLensContextResult =
  | { kind: "available"; context: AdaptedMatchupLensContext }
  | { kind: "unavailable"; reason: string | null; awayAbv: string | null; homeAbv: string | null };

const UNAVAILABLE_FALLBACK_REASON =
  "Lens evidence isn’t available for this game yet.";

export async function fetchMatchupLensContext(gameId: string): Promise<MatchupLensContextResult> {
  const state = classifyGameId(gameId);
  if (state.kind !== "valid") {
    throw new ApiError("invalid-request", "Invalid game identifier", 400);
  }

  const url = `${API_BASE}/game/${encodeURIComponent(state.gameId)}/lens-context`;

  let res: Response;
  try {
    res = await fetch(url, { headers: await authHeaders() });
  } catch {
    // No request detail is logged here: it can carry header content.
    throw new ApiError("network", "Network error");
  }

  const rawBody = await handleLensApiResponse(res, "GET /game/:id/lens-context");

  let payload: MatchupLensV1Response;
  try {
    payload = JSON.parse(rawBody) as MatchupLensV1Response;
  } catch {
    throw new ApiError("invalid-response", "Invalid response", res.status);
  }

  if (!payload || payload.schema_version !== MATCHUP_LENS_SCHEMA_VERSION) {
    throw new ApiError("invalid-response", "Unexpected response schema", res.status);
  }

  if (payload.available !== true) {
    return {
      kind: "unavailable",
      reason: typeof payload.reason === "string" && payload.reason.length > 0
        ? payload.reason
        : UNAVAILABLE_FALLBACK_REASON,
      awayAbv: payload.game?.away_team?.team_abv ?? null,
      homeAbv: payload.game?.home_team?.team_abv ?? null,
    };
  }

  try {
    return { kind: "available", context: adaptMatchupLensV1(payload) };
  } catch (err) {
    if (err instanceof MatchupLensContractError) {
      // Validator detail stays inside the error object; never in browser logs.
      throw new ApiError("invalid-response", "Contract violation", res.status);
    }
    throw err;
  }
}

/** Only transient transport failures are retried, and only once. */
export function isRetryableLensError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === "network") return true;
  if (error.kind === "timeout") return true;
  return error.kind === "server" && (error.status === 500 || error.status === 504);
}

export function useMatchupLensContext(gameId: string | null) {
  return useQuery({
    queryKey: ["matchup-lens-context", gameId],
    queryFn: () => fetchMatchupLensContext(gameId as string),
    enabled: Boolean(gameId),
    // Live evidence is never written to localStorage.
    meta: { persist: false },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount: number, error: unknown) =>
      failureCount < 1 && isRetryableLensError(error),
  });
}
