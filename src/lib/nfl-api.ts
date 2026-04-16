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
  const res = await fetch(`${API_BASE}/games?date=${dateStr}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch schedule (${res.status})`);
  }
  const data: BackendResponse = await res.json();
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
