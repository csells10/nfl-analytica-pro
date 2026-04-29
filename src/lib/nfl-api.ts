import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { perfNow, perfTime } from "@/lib/perf";
import { getAuthToken, firebaseAuth } from "@/lib/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

const API_BASE = "https://nfl-games-app-main-362530996210.us-central1.run.app";

/**
 * Typed API error so the UI can render a safe, user-facing message based on
 * `kind` without ever surfacing raw backend response bodies.
 */
export type ApiErrorKind = "unauthenticated" | "forbidden" | "network" | "server" | "unknown";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

export function userMessageForError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "unauthenticated":
        return "Your session expired. Please sign in again.";
      case "forbidden":
        return "This account is not authorized for GameLens.";
      case "network":
        return "Network error. Please check your connection and try again.";
      case "server":
      case "unknown":
      default:
        return "Something went wrong loading GameLens data.";
    }
  }
  return "Something went wrong loading GameLens data.";
}

/**
 * Build request headers with the current Firebase ID token attached as a
 * Bearer token. The backend enforces this — unauthenticated requests are
 * rejected with 401.
 */
async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Centralized response handler. Converts non-OK responses into a typed
 * `ApiError` and signs the user out on 401 so the UI returns to /login.
 */
async function handleApiResponse(res: Response, context: string): Promise<string> {
  const rawBody = await res.text();
  if (res.ok) return rawBody;

  // Log raw body server/dev side only — never throw it into the UI.
  console.error(`[nfl-api] ${context} failed`, res.status, res.statusText, rawBody);

  if (res.status === 401) {
    // Token missing/expired — force sign-out so ProtectedRoute redirects to /login.
    firebaseSignOut(firebaseAuth).catch((e) => console.error("[nfl-api] signOut failed:", e));
    throw new ApiError("unauthenticated", "Session expired", 401);
  }
  if (res.status === 403) {
    throw new ApiError("forbidden", "Account not authorized", 403);
  }
  if (res.status >= 500) {
    throw new ApiError("server", "Server error", res.status);
  }
  throw new ApiError("unknown", "Request failed", res.status);
}

export interface NflGame {
  id: string;
  date: string;
  time: string;
  awayTeam: string;
  homeTeam: string;
  awayFullName: string;
  homeFullName: string;
  week?: number;
  network?: string;
  status: string;
}

interface BackendGame {
  gameID: string;
  away: string;
  home: string;
  gameTime: string;
  gameStatus: string;
}

interface BackendResponse {
  date: string;
  games: BackendGame[];
}

function mapBackendGame(game: BackendGame, dateStr: string): NflGame {
  return {
    id: game.gameID,
    date: dateStr,
    time: game.gameTime,
    awayTeam: game.away,
    homeTeam: game.home,
    awayFullName: game.away,
    homeFullName: game.home,
    status: game.gameStatus,
  };
}

async function fetchNflSchedule(dateStr: string): Promise<NflGame[]> {
  const url = `${API_BASE}/games?date=${dateStr}`;
  console.log("[nfl-api] GET", url);

  let res: Response;
  try {
    res = await fetch(url, { headers: await authHeaders() });
  } catch (err) {
    console.error("[nfl-api] Network error (likely CORS or offline):", err);
    throw new Error(
      `Network error reaching backend. This is usually a CORS issue on the Cloud Run service. Original: ${(err as Error).message}`
    );
  }

  const rawBody = await res.text();
  if (!res.ok) {
    console.error("[nfl-api] HTTP error", res.status, res.statusText, rawBody);
    throw new Error(`Backend returned ${res.status} ${res.statusText}: ${rawBody.slice(0, 200)}`);
  }

  let data: BackendResponse;
  try {
    data = JSON.parse(rawBody);
  } catch (err) {
    console.error("[nfl-api] Failed to parse JSON. Raw body:", rawBody);
    throw new Error(`Invalid JSON from backend: ${rawBody.slice(0, 200)}`);
  }

  console.log("[nfl-api] Received", data.games?.length ?? 0, "games for", data.date);
  return (data.games ?? []).map((g) => mapBackendGame(g, data.date));
}

// ─────────────────────────────────────────────────────────────
// Game details (matchup page)
// ─────────────────────────────────────────────────────────────

export interface ApiTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
}

export interface ApiQuarterScore {
  q1: number; q2: number; q3: number; q4: number; ot?: number; total: number;
}

export interface GameDetails {
  header: {
    game_id: string;
    game_date: string;
    game_time: string;
    game_status: string;
    season: string;
    season_type: string;
    game_week: string;
    away_team: ApiTeam;
    home_team: ApiTeam;
    espn_link: string;
  };
  final_score: { away: ApiQuarterScore; home: ApiQuarterScore } | null;
  game_profile: Array<{
    category: string;
    level: string;
    tilt: string;
    // ── Optional structured fields (backend Phase 1, additive) ──
    level_index?: 0 | 1 | 2 | 3;
    icon?: "activity" | "shield" | "zap" | "trending-up" | "target" | "alert-triangle";
    tilt_team?: "home" | "away" | "neutral" | null;
    tilt_text?: string;
  }> | null;
  matchup_lean: {
    target_team: string;
    lean_summary: string;
    focus_summary: string;
    confidence: string;
    confidence_context?: string | null;
    // Backend Phase 2 (additive): refined matchup-lean signals.
    profile_type?:
      | "coin_flip_profile"
      | "split_profile"
      | "confirmed_edge"
      | "conflicting_profile"
      | "no_clear_edge"
      | string
      | null;
    target_side?: "home" | "away" | "neutral" | string | null;
    signal_score?: number | null;
    core_area_context?: {
      available?: boolean | null;
      profile_type?:
        | "coin_flip_profile"
        | "split_profile"
        | "confirmed_edge"
        | "conflicting_profile"
        | "no_clear_edge"
        | string
        | null;
      core_area_split?: string | null;
      core_area_leader?: "home" | "away" | "neutral" | string | null;
      core_gap?: number | null;
      away_core_avg?: number | null;
      home_core_avg?: number | null;
      away_core_wins?: number | null;
      home_core_wins?: number | null;
      neutral_core_areas?: number | null;
      total_core_areas?: number | null;
    } | null;
  } | null;
  team_comparison: Array<{
    label: string;
    away: number;
    home: number;
    better: "away" | "home" | "even" | string;
  }> | null;
  core_area_comparison?: Array<{
    core_area: string;
    away_score: number;
    home_score: number;
    leader: "away" | "home" | "neutral" | string;
    metric_count: number;
  }> | null;
  model_outcome: {
    result: "Correct" | "Incorrect" | "No Pick" | string;
    predicted_team: string | null;
    actual_winner: string | null;
  } | null;
  model_trust?: {
    reasoning?: {
      headline?: string | null;
      summary?: string | null;
      has_content?: boolean | null;
      drivers?: Array<{
        sentence?: string | null;
        gap?: string | null;
        label?: string | null;
        category?: string | null;
        team?: string | null;
      }> | null;
    } | null;
    matchup_advantage?: {
      away?: number | null;
      home?: number | null;
      leader?: "away" | "home" | string | null;
      visible?: boolean | null;
      tooltip?: string | null;
    } | null;
    edge?: {
      strength?: string | null;
      score?: number | null;
      description?: string | null;
      tooltip?: string | null;
      has_content?: boolean | null;
    } | null;
    signal_alignment?: {
      summary?: string | null;
      summary_label?: string | null;
      summary_code?: string | null;
      tooltip?: string | null;
      aligned_count?: number | null;
      total_count?: number | null;
      signals?: Array<{
        category?: string | null;
        aligns?: "yes" | "no" | "neutral" | string | null;
        favored_side?: "away" | "home" | string | null;
        sentence?: string | null;
        description?: string | null;
      }> | null;
    } | null;
    learning_label?: string | { text?: string | null; tone?: string | null } | null;
  } | null;
}

async function fetchGameDetails(gameId: string): Promise<GameDetails> {
  const url = `${API_BASE}/game/${encodeURIComponent(gameId)}`;
  console.log("[nfl-api] GET", url);

  let res: Response;
  try {
    res = await fetch(url, { headers: await authHeaders() });
  } catch (err) {
    console.error("[nfl-api] Network error:", err);
    throw new Error(`Network error reaching backend: ${(err as Error).message}`);
  }

  const rawBody = await res.text();
  if (!res.ok) {
    console.error("[nfl-api] HTTP error", res.status, rawBody);
    throw new Error(`Backend returned ${res.status}: ${rawBody.slice(0, 200)}`);
  }

  try {
    return JSON.parse(rawBody) as GameDetails;
  } catch (err) {
    console.error("[nfl-api] Failed to parse JSON:", rawBody);
    throw new Error(`Invalid JSON from backend: ${rawBody.slice(0, 200)}`);
  }
}

export function useGameDetails(gameId: string | undefined) {
  return useQuery({
    queryKey: ["nfl-game", gameId],
    queryFn: async () => {
      const start = perfNow();
      try {
        return await fetchGameDetails(gameId!);
      } finally {
        perfTime(`API game ${gameId}`, start);
      }
    },
    enabled: !!gameId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useNflSchedule(date: Date | undefined) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : "";

  return useQuery({
    queryKey: ["nfl-schedule", dateStr],
    queryFn: async () => {
      const start = perfNow();
      try {
        return await fetchNflSchedule(dateStr);
      } finally {
        perfTime(`API schedule ${dateStr}`, start);
      }
    },
    enabled: !!dateStr,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
