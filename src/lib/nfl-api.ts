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
