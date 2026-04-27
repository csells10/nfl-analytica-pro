import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const API_BASE = "https://nfl-games-app-main-362530996210.us-central1.run.app";

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
    res = await fetch(url);
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
  game_profile: Array<{ category: string; level: string; tilt: string }> | null;
  matchup_lean: {
    target_team: string;
    lean_summary: string;
    focus_summary: string;
    confidence: string;
    confidence_context?: string | null;
  } | null;
  team_comparison: Array<{
    label: string;
    away: number;
    home: number;
    better: "away" | "home" | "even" | string;
  }> | null;
  model_outcome: {
    result: "Correct" | "Incorrect" | "No Pick" | string;
    predicted_team: string | null;
    actual_winner: string | null;
  } | null;
  model_trust?: {
    reasoning?: {
      headline?: string | null;
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
    res = await fetch(url);
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
    queryFn: () => fetchGameDetails(gameId!),
    enabled: !!gameId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useNflSchedule(date: Date | undefined) {
  const dateStr = date ? format(date, "yyyy-MM-dd") : "";

  return useQuery({
    queryKey: ["nfl-schedule", dateStr],
    queryFn: () => fetchNflSchedule(dateStr),
    enabled: !!dateStr,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
