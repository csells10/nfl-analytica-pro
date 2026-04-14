// Sample NFL slate data — replace with real API/DB calls later

export interface SlateGame {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "1:00 PM ET"
  awayTeam: string;
  homeTeam: string;
  week?: number;
  network?: string;
}

export const sampleSlateGames: SlateGame[] = [
  // 2025-01-05 — Week 18
  { id: "g1", date: "2025-01-05", time: "1:00 PM ET", awayTeam: "MIN", homeTeam: "DET", week: 18, network: "FOX" },
  { id: "g2", date: "2025-01-05", time: "1:00 PM ET", awayTeam: "DEN", homeTeam: "KC", week: 18, network: "CBS" },
  { id: "g3", date: "2025-01-05", time: "1:00 PM ET", awayTeam: "NE", homeTeam: "BUF", week: 18, network: "CBS" },
  { id: "g4", date: "2025-01-05", time: "4:25 PM ET", awayTeam: "NYG", homeTeam: "PHI", week: 18, network: "FOX" },
  { id: "g5", date: "2025-01-05", time: "4:25 PM ET", awayTeam: "CAR", homeTeam: "ATL", week: 18, network: "FOX" },
  { id: "g6", date: "2025-01-05", time: "8:20 PM ET", awayTeam: "CIN", homeTeam: "PIT", week: 18, network: "NBC" },
  // 2024-12-29 — Week 17
  { id: "g7", date: "2024-12-29", time: "1:00 PM ET", awayTeam: "ARI", homeTeam: "SF", week: 17, network: "FOX" },
  { id: "g8", date: "2024-12-29", time: "1:00 PM ET", awayTeam: "CLE", homeTeam: "BAL", week: 17, network: "CBS" },
  { id: "g9", date: "2024-12-29", time: "4:25 PM ET", awayTeam: "WAS", homeTeam: "DAL", week: 17, network: "FOX" },
  { id: "g10", date: "2024-12-29", time: "8:20 PM ET", awayTeam: "MIA", homeTeam: "NYJ", week: 17, network: "NBC" },
  // 2024-12-22 — Week 16
  { id: "g11", date: "2024-12-22", time: "1:00 PM ET", awayTeam: "CHI", homeTeam: "GB", week: 16, network: "FOX" },
  { id: "g12", date: "2024-12-22", time: "1:00 PM ET", awayTeam: "TEN", homeTeam: "IND", week: 16, network: "CBS" },
  { id: "g13", date: "2024-12-22", time: "4:25 PM ET", awayTeam: "JAX", homeTeam: "LV", week: 16, network: "CBS" },
  { id: "g14", date: "2024-12-22", time: "8:20 PM ET", awayTeam: "TB", homeTeam: "NO", week: 16, network: "NBC" },
];

// Dates that have games (for highlighting in the date picker)
export const gameDates = [...new Set(sampleSlateGames.map((g) => g.date))];

export function getGamesForDate(date: string): SlateGame[] {
  return sampleSlateGames.filter((g) => g.date === date);
}
