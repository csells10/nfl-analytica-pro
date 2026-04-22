// NFL team metadata — logos served from ESPN's CDN.

export interface TeamMeta {
  abbr: string;
  shortName: string; // e.g. "Packers"
  fullName: string;  // e.g. "Green Bay Packers"
  location: string;  // e.g. "Green Bay"
  espnId: string;
}

const TEAMS: Record<string, TeamMeta> = {
  ARI: { abbr: "ARI", shortName: "Cardinals", location: "Arizona", fullName: "Arizona Cardinals", espnId: "ari" },
  ATL: { abbr: "ATL", shortName: "Falcons", location: "Atlanta", fullName: "Atlanta Falcons", espnId: "atl" },
  BAL: { abbr: "BAL", shortName: "Ravens", location: "Baltimore", fullName: "Baltimore Ravens", espnId: "bal" },
  BUF: { abbr: "BUF", shortName: "Bills", location: "Buffalo", fullName: "Buffalo Bills", espnId: "buf" },
  CAR: { abbr: "CAR", shortName: "Panthers", location: "Carolina", fullName: "Carolina Panthers", espnId: "car" },
  CHI: { abbr: "CHI", shortName: "Bears", location: "Chicago", fullName: "Chicago Bears", espnId: "chi" },
  CIN: { abbr: "CIN", shortName: "Bengals", location: "Cincinnati", fullName: "Cincinnati Bengals", espnId: "cin" },
  CLE: { abbr: "CLE", shortName: "Browns", location: "Cleveland", fullName: "Cleveland Browns", espnId: "cle" },
  DAL: { abbr: "DAL", shortName: "Cowboys", location: "Dallas", fullName: "Dallas Cowboys", espnId: "dal" },
  DEN: { abbr: "DEN", shortName: "Broncos", location: "Denver", fullName: "Denver Broncos", espnId: "den" },
  DET: { abbr: "DET", shortName: "Lions", location: "Detroit", fullName: "Detroit Lions", espnId: "det" },
  GB:  { abbr: "GB",  shortName: "Packers", location: "Green Bay", fullName: "Green Bay Packers", espnId: "gb" },
  HOU: { abbr: "HOU", shortName: "Texans", location: "Houston", fullName: "Houston Texans", espnId: "hou" },
  IND: { abbr: "IND", shortName: "Colts", location: "Indianapolis", fullName: "Indianapolis Colts", espnId: "ind" },
  JAX: { abbr: "JAX", shortName: "Jaguars", location: "Jacksonville", fullName: "Jacksonville Jaguars", espnId: "jax" },
  KC:  { abbr: "KC",  shortName: "Chiefs", location: "Kansas City", fullName: "Kansas City Chiefs", espnId: "kc" },
  LAC: { abbr: "LAC", shortName: "Chargers", location: "Los Angeles", fullName: "Los Angeles Chargers", espnId: "lac" },
  LAR: { abbr: "LAR", shortName: "Rams", location: "Los Angeles", fullName: "Los Angeles Rams", espnId: "lar" },
  LV:  { abbr: "LV",  shortName: "Raiders", location: "Las Vegas", fullName: "Las Vegas Raiders", espnId: "lv" },
  MIA: { abbr: "MIA", shortName: "Dolphins", location: "Miami", fullName: "Miami Dolphins", espnId: "mia" },
  MIN: { abbr: "MIN", shortName: "Vikings", location: "Minnesota", fullName: "Minnesota Vikings", espnId: "min" },
  NE:  { abbr: "NE",  shortName: "Patriots", location: "New England", fullName: "New England Patriots", espnId: "ne" },
  NO:  { abbr: "NO",  shortName: "Saints", location: "New Orleans", fullName: "New Orleans Saints", espnId: "no" },
  NYG: { abbr: "NYG", shortName: "Giants", location: "New York", fullName: "New York Giants", espnId: "nyg" },
  NYJ: { abbr: "NYJ", shortName: "Jets", location: "New York", fullName: "New York Jets", espnId: "nyj" },
  PHI: { abbr: "PHI", shortName: "Eagles", location: "Philadelphia", fullName: "Philadelphia Eagles", espnId: "phi" },
  PIT: { abbr: "PIT", shortName: "Steelers", location: "Pittsburgh", fullName: "Pittsburgh Steelers", espnId: "pit" },
  SEA: { abbr: "SEA", shortName: "Seahawks", location: "Seattle", fullName: "Seattle Seahawks", espnId: "sea" },
  SF:  { abbr: "SF",  shortName: "49ers", location: "San Francisco", fullName: "San Francisco 49ers", espnId: "sf" },
  TB:  { abbr: "TB",  shortName: "Buccaneers", location: "Tampa Bay", fullName: "Tampa Bay Buccaneers", espnId: "tb" },
  TEN: { abbr: "TEN", shortName: "Titans", location: "Tennessee", fullName: "Tennessee Titans", espnId: "ten" },
  WAS: { abbr: "WAS", shortName: "Commanders", location: "Washington", fullName: "Washington Commanders", espnId: "was" },
};

export function getTeam(abbr: string | undefined | null): TeamMeta {
  const key = (abbr ?? "").toUpperCase();
  return (
    TEAMS[key] ?? {
      abbr: key || "—",
      shortName: key || "Team",
      location: "",
      fullName: key || "Team",
      espnId: key.toLowerCase(),
    }
  );
}

export function teamLogoUrl(abbr: string | undefined | null, size = 500): string {
  const team = getTeam(abbr);
  return `https://a.espncdn.com/i/teamlogos/nfl/${size}/${team.espnId}.png`;
}
