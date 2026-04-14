import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

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

interface EspnCompetitor {
  homeAway: "home" | "away";
  team: {
    abbreviation: string;
    displayName: string;
  };
}

interface EspnBroadcast {
  names?: string[];
}

interface EspnCompetition {
  competitors: EspnCompetitor[];
  broadcasts?: EspnBroadcast[];
  startDate: string;
}

interface EspnEvent {
  id: string;
  competitions: EspnCompetition[];
  status: {
    type: {
      shortDetail: string;
    };
  };
}

interface EspnResponse {
  events: EspnEvent[];
  week?: {
    number: number;
  };
  season?: {
    type: number;
    year: number;
  };
}

function parseEspnResponse(data: EspnResponse): NflGame[] {
  const weekNum = data.week?.number;

  return data.events.map((event) => {
    const comp = event.competitions[0];
    const away = comp.competitors.find((c) => c.homeAway === "away")!;
    const home = comp.competitors.find((c) => c.homeAway === "home")!;

    const gameDate = new Date(comp.startDate);
    const timeStr = gameDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });

    const broadcast = comp.broadcasts?.[0]?.names?.[0] ?? undefined;

    return {
      id: event.id,
      date: format(gameDate, "yyyy-MM-dd"),
      time: timeStr,
      awayTeam: away.team.abbreviation,
      homeTeam: home.team.abbreviation,
      awayFullName: away.team.displayName,
      homeFullName: home.team.displayName,
      week: weekNum,
      network: broadcast,
      status: event.status.type.shortDetail,
    };
  });
}

async function fetchNflSchedule(dateStr: string): Promise<NflGame[]> {
  const espnDate = dateStr.replace(/-/g, "");
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${espnDate}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch schedule (${res.status})`);
  }

  const data: EspnResponse = await res.json();
  return parseEspnResponse(data);
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
