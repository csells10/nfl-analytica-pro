// Sample NFL analytics data — replace with real API/DB calls later

export interface Game {
  id: string;
  week: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "final" | "live" | "upcoming";
}

export interface TeamMetric {
  team: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  yardsPerGame: number;
  turnoverDiff: number;
}

export interface WeeklyTrend {
  week: string;
  avgPoints: number;
  totalGames: number;
  homeWinPct: number;
}

export interface Insight {
  id: string;
  text: string;
  type: "trend" | "alert" | "note";
  timestamp: string;
}

export const sampleGames: Game[] = [
  { id: "g1", week: 18, date: "2025-01-05", homeTeam: "DET", awayTeam: "MIN", homeScore: 31, awayScore: 24, status: "final" },
  { id: "g2", week: 18, date: "2025-01-05", homeTeam: "KC", awayTeam: "DEN", homeScore: 28, awayScore: 17, status: "final" },
  { id: "g3", week: 18, date: "2025-01-05", homeTeam: "BUF", awayTeam: "NE", homeScore: 35, awayScore: 10, status: "final" },
  { id: "g4", week: 18, date: "2025-01-05", homeTeam: "PHI", awayTeam: "NYG", homeScore: 24, awayScore: 20, status: "final" },
  { id: "g5", week: 17, date: "2024-12-29", homeTeam: "SF", awayTeam: "ARI", homeScore: 20, awayScore: 17, status: "final" },
  { id: "g6", week: 17, date: "2024-12-29", homeTeam: "BAL", awayTeam: "CLE", homeScore: 34, awayScore: 10, status: "final" },
  { id: "g7", week: 17, date: "2024-12-29", homeTeam: "DAL", awayTeam: "WAS", homeScore: 17, awayScore: 27, status: "final" },
  { id: "g8", week: 16, date: "2024-12-22", homeTeam: "GB", awayTeam: "CHI", homeScore: 28, awayScore: 14, status: "final" },
];

export const sampleTeamMetrics: TeamMetric[] = [
  { team: "KC", wins: 15, losses: 2, pointsFor: 476, pointsAgainst: 289, yardsPerGame: 365.2, turnoverDiff: 12 },
  { team: "DET", wins: 14, losses: 3, pointsFor: 512, pointsAgainst: 310, yardsPerGame: 398.7, turnoverDiff: 8 },
  { team: "BUF", wins: 13, losses: 4, pointsFor: 498, pointsAgainst: 302, yardsPerGame: 381.4, turnoverDiff: 10 },
  { team: "BAL", wins: 13, losses: 4, pointsFor: 483, pointsAgainst: 298, yardsPerGame: 405.1, turnoverDiff: 7 },
  { team: "PHI", wins: 12, losses: 5, pointsFor: 421, pointsAgainst: 315, yardsPerGame: 356.8, turnoverDiff: 5 },
  { team: "SF", wins: 11, losses: 6, pointsFor: 405, pointsAgainst: 328, yardsPerGame: 372.3, turnoverDiff: 3 },
  { team: "GB", wins: 10, losses: 7, pointsFor: 389, pointsAgainst: 342, yardsPerGame: 348.9, turnoverDiff: 1 },
  { team: "DAL", wins: 7, losses: 10, pointsFor: 345, pointsAgainst: 398, yardsPerGame: 320.5, turnoverDiff: -6 },
];

export const sampleWeeklyTrends: WeeklyTrend[] = [
  { week: "Wk 12", avgPoints: 22.4, totalGames: 16, homeWinPct: 56 },
  { week: "Wk 13", avgPoints: 24.1, totalGames: 16, homeWinPct: 62 },
  { week: "Wk 14", avgPoints: 21.8, totalGames: 14, homeWinPct: 50 },
  { week: "Wk 15", avgPoints: 25.3, totalGames: 16, homeWinPct: 58 },
  { week: "Wk 16", avgPoints: 23.7, totalGames: 16, homeWinPct: 54 },
  { week: "Wk 17", avgPoints: 22.9, totalGames: 16, homeWinPct: 52 },
  { week: "Wk 18", avgPoints: 24.6, totalGames: 16, homeWinPct: 60 },
];

export const sampleInsights: Insight[] = [
  { id: "i1", text: "KC has won 10 straight — longest active win streak in the league.", type: "trend", timestamp: "2025-01-05T18:30:00Z" },
  { id: "i2", text: "DET leads the NFL in points scored (512) for the season.", type: "trend", timestamp: "2025-01-05T16:00:00Z" },
  { id: "i3", text: "Home teams won 60% of Week 18 matchups — above season avg of 55%.", type: "note", timestamp: "2025-01-05T22:00:00Z" },
  { id: "i4", text: "DAL turnover differential (-6) is worst among playoff-contending teams.", type: "alert", timestamp: "2025-01-04T12:00:00Z" },
  { id: "i5", text: "BUF averaging 35+ PPG over last 3 weeks.", type: "trend", timestamp: "2025-01-05T20:00:00Z" },
];

export const kpiData = {
  gamesTracked: 272,
  teamsCovered: 32,
  avgPoints: 23.4,
  weeklyTrendDirection: "up" as const,
  weeklyTrendValue: 2.1,
};
