// Sample NFL slate data — replace with real API/DB calls later

export interface SlateGame {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "1:00 PM ET"
  awayTeam: string;
  homeTeam: string;
  network?: string;
}

export const sampleSlateGames: SlateGame[] = [
  // 2025-01-05 — Week 18
  { id: "g1", date: "2025-01-05", time: "1:00 PM ET", awayTeam: "MIN", homeTeam: "DET", network: "FOX" },
  { id: "g2", date: "2025-01-05", time: "1:00 PM ET", awayTeam: "DEN", homeTeam: "KC", network: "CBS" },
  { id: "g3", date: "2025-01-05", time: "1:00 PM ET", awayTeam: "NE", homeTeam: "BUF", network: "CBS" },
  { id: "g4", date: "2025-01-05", time: "4:25 PM ET", awayTeam: "NYG", homeTeam: "PHI", network: "FOX" },
  { id: "g5", date: "2025-01-05", time: "4:25 PM ET", awayTeam: "CAR", homeTeam: "ATL", network: "FOX" },
  { id: "g6", date: "2025-01-05", time: "8:20 PM ET", awayTeam: "CIN", homeTeam: "PIT", network: "NBC" },
  // 2024-12-29 — Week 17
  { id: "g7", date: "2024-12-29", time: "1:00 PM ET", awayTeam: "ARI", homeTeam: "SF", network: "FOX" },
  { id: "g8", date: "2024-12-29", time: "1:00 PM ET", awayTeam: "CLE", homeTeam: "BAL", network: "CBS" },
  { id: "g9", date: "2024-12-29", time: "4:25 PM ET", awayTeam: "WAS", homeTeam: "DAL", network: "FOX" },
  { id: "g10", date: "2024-12-29", time: "8:20 PM ET", awayTeam: "MIA", homeTeam: "NYJ", network: "NBC" },
  // 2024-12-22 — Week 16
  { id: "g11", date: "2024-12-22", time: "1:00 PM ET", awayTeam: "CHI", homeTeam: "GB", network: "FOX" },
  { id: "g12", date: "2024-12-22", time: "1:00 PM ET", awayTeam: "TEN", homeTeam: "IND", network: "CBS" },
  { id: "g13", date: "2024-12-22", time: "4:25 PM ET", awayTeam: "JAX", homeTeam: "LV", network: "CBS" },
  { id: "g14", date: "2024-12-22", time: "8:20 PM ET", awayTeam: "TB", homeTeam: "NO", network: "NBC" },
];

// Dates that have games (for highlighting in the date picker)
export const gameDates = [...new Set(sampleSlateGames.map((g) => g.date))];

export function getGamesForDate(date: string): SlateGame[] {
  return sampleSlateGames.filter((g) => g.date === date);
}
