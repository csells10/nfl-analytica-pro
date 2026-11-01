import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { GameDetails } from "@/lib/nfl-api";
import { getKnownTeam, getTeam, teamLogoUrl } from "@/lib/nfl-teams";
import {
  DEFAULT_DOCUMENT_TITLE,
  formatGameDate,
  matchupDocumentTitle,
  parseGameIdContext,
} from "@/lib/game-display";

describe("parseGameIdContext", () => {
  it("recovers teams and date from a valid game ID", () => {
    expect(parseGameIdContext("20260921_NYG@LAR")).toEqual({
      awayAbbr: "NYG",
      homeAbbr: "LAR",
      date: "2026-09-21",
    });
  });

  it.each([
    undefined,
    "",
    "not-a-game",
    "20260921_NYG",
    "20261340_NYG@LAR", // month 13, day 40 — invalid calendar date
    "20260230_NYG@LAR", // Feb 30 does not exist
  ])("returns null for unsafe input %s", (raw) => {
    expect(parseGameIdContext(raw)).toBeNull();
  });
});

describe("display team aliases", () => {
  it.each(["WSH", "wsh", "WAS", "was"])("resolves %s to Washington's registry name and logo", (abbr) => {
    expect(getKnownTeam(abbr)).toBe(getKnownTeam("WAS"));
    expect(getTeam(abbr).fullName).toBe("Washington Commanders");
    expect(teamLogoUrl(abbr)).toBe("https://a.espncdn.com/i/teamlogos/nfl/500/was.png");
  });

  it("leaves unknown teams unrecognized", () => {
    expect(getKnownTeam("ZZZ")).toBeNull();
    expect(getTeam("ZZZ").abbr).toBe("ZZZ");
  });
});

describe("formatGameDate", () => {
  it("formats strict dates in UTC without day shifts", () => {
    expect(formatGameDate("2026-11-01")).toBe("Nov 1, 2026");
    expect(formatGameDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("passes through preformatted backend display strings", () => {
    expect(formatGameDate("September 20, 2026")).toBe("September 20, 2026");
  });

  it("rejects empty input", () => {
    expect(formatGameDate(null)).toBeNull();
    expect(formatGameDate("")).toBeNull();
    expect(formatGameDate("   ")).toBeNull();
  });
});

describe("matchupDocumentTitle", () => {
  it("builds the Game Details title", () => {
    expect(matchupDocumentTitle("ATL", "TB", "2026-11-01")).toBe("ATL @ TB · Nov 1, 2026 | GameLens");
  });

  it("builds the Matchup Lab title", () => {
    expect(matchupDocumentTitle("ATL", "TB", "2026-11-01", "lab")).toBe(
      "ATL @ TB · Lab · Nov 1, 2026 | GameLens",
    );
  });

  it("returns null when identity or date is missing", () => {
    expect(matchupDocumentTitle(null, "TB", "2026-11-01")).toBeNull();
    expect(matchupDocumentTitle("ATL", "TB", null)).toBeNull();
  });
});

// ── Page-level: fresh-tab briefing context and tab titles ──

const mocks = vi.hoisted(() => ({
  details: undefined as GameDetails | undefined,
  requestedGame: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io", name: "QA" }, signOut: vi.fn() }),
}));
vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", toggle: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));
vi.mock("@/lib/firebase", () => ({ getAuthToken: async () => "test-token", firebaseAuth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn(async () => undefined) }));
vi.mock("@/lib/nfl-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/nfl-api")>();
  return {
    ...original,
    useGameDetails: (gameId: string) => {
      mocks.requestedGame(gameId);
      return ({
      data: mocks.details,
      isLoading: !mocks.details,
      isFetching: !mocks.details,
      isError: false,
      error: null,
      });
    },
  };
});

import Matchup from "@/pages/Matchup";

const canonicalDetails: GameDetails = {
  header: {
    game_id: "20260920_NO@BAL",
    game_date: "September 20, 2026",
    game_time: "1:00 PM ET",
    game_status: "Scheduled",
    season: "2026",
    season_type: "Regular Season",
    game_week: "Week 2",
    away_team: { id: "18", name: "New Orleans Saints", abbreviation: "NO", logo: "" },
    home_team: { id: "33", name: "Baltimore Ravens", abbreviation: "BAL", logo: "" },
    espn_link: "",
  },
  final_score: null,
  game_profile: null,
  matchup_lean: null,
  team_comparison: null,
  core_area_comparison: null,
  model_outcome: null,
  model_trust: null,
  matchup_breakdown: null,
};

function renderMatchup(entry: { pathname: string; search?: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/matchup/:id" element={<Matchup />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.details = undefined;
  mocks.requestedGame.mockClear();
  document.title = DEFAULT_DOCUMENT_TITLE;
  localStorage.setItem("hasSeenMatchupSectionSpotlightTour", "true");
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("Game Details fresh-tab briefing and tab title", () => {
  it.each(["@", "%40"])("renders the PHI%sWSH fresh-tab briefing while the request is pending", (separator) => {
    renderMatchup({
      pathname: `/matchup/20261101_PHI${separator}WSH`,
      search: "?date=2026-11-01",
    });

    expect(screen.getByText("Philadelphia Eagles")).toBeTruthy();
    expect(screen.getByText("Washington Commanders")).toBeTruthy();
    expect(screen.getByAltText("Philadelphia Eagles logo").getAttribute("src")).toBe(
      "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png",
    );
    expect(screen.getByAltText("Washington Commanders logo").getAttribute("src")).toBe(
      "https://a.espncdn.com/i/teamlogos/nfl/500/was.png",
    );
    expect(screen.getByText("Game Profile")).toBeTruthy();
    expect(screen.getByText("Core Areas")).toBeTruthy();
    expect(screen.getByText("Team Comparison")).toBeTruthy();
    expect(screen.getByTestId("analysis-handoff-chevron")).toBeTruthy();
    expect(screen.getByTestId("analysis-progress-rail")).toBeTruthy();
    expect(screen.getByTestId("analysis-signal").classList.contains("animate-analysis-signal-dot")).toBe(true);
    expect(screen.getByTestId("analysis-signal-track").firstElementChild?.classList.contains("animate-analysis-signal-position")).toBe(true);
    expect(document.title).toBe("PHI @ WSH · Nov 1, 2026 | GameLens");
    expect(mocks.requestedGame).toHaveBeenCalledWith("20261101_PHI@WSH");
    expect(mocks.requestedGame).not.toHaveBeenCalledWith("20261101_PHI@WAS");
  });

  it("retains neutral loading for a genuinely unknown team in a fresh tab", () => {
    renderMatchup({ pathname: "/matchup/20261101_PHI%40ZZZ", search: "?date=2026-11-01" });

    const loading = screen.getByTestId("game-details-loading");
    expect(loading.textContent).toBe("Preparing game analysis");
    expect(loading.querySelector("img")).toBeNull();
    expect(screen.queryByText("Game Profile")).toBeNull();
    expect(screen.queryByTestId("analysis-signal")).toBeNull();
    expect(mocks.requestedGame).toHaveBeenCalledWith("20261101_PHI@ZZZ");
  });

  it("recovers the full briefing from the game ID when router state is absent", () => {
    renderMatchup({ pathname: "/matchup/20260920_NO%40BAL" });

    expect(screen.getByTestId("game-details-loading")).toBeTruthy();
    expect(screen.getByText("New Orleans Saints")).toBeTruthy();
    expect(screen.getByText("Baltimore Ravens")).toBeTruthy();
    expect(screen.getByAltText("New Orleans Saints logo")).toBeTruthy();
    expect(screen.getByAltText("Baltimore Ravens logo")).toBeTruthy();
    expect(screen.getByText("Game Profile")).toBeTruthy();
    expect(screen.getByTestId("analysis-progress-rail")).toBeTruthy();
    // No week is invented without router state.
    expect(screen.queryByText(/Week \d+/)).toBeNull();
  });

  it("sets the tab title from the game ID before data arrives", () => {
    renderMatchup({ pathname: "/matchup/20261101_ATL%40TB" });
    expect(document.title).toBe("ATL @ TB · Nov 1, 2026 | GameLens");
  });

  it("updates the tab title from authoritative game data once loaded", () => {
    mocks.details = canonicalDetails;
    renderMatchup({ pathname: "/matchup/20260920_NO%40BAL" });
    expect(document.title).toBe("NO @ BAL · September 20, 2026 | GameLens");
  });

  it("ignores router state that belongs to a different game", () => {
    renderMatchup({
      pathname: "/matchup/20260920_NO%40BAL",
      state: {
        game: {
          id: "20260921_NYG@LAR",
          date: "September 21, 2026",
          time: "1:00 PM ET",
          awayTeam: "NYG",
          homeTeam: "LAR",
          awayFullName: "NYG",
          homeFullName: "LAR",
          status: "Scheduled",
        },
      },
    });

    expect(screen.getByText("New Orleans Saints")).toBeTruthy();
    expect(screen.queryByText("New York Giants")).toBeNull();
    expect(document.title).toBe("NO @ BAL · Sep 20, 2026 | GameLens");
  });

  it("keeps a neutral briefing and default title for a malformed game ID", () => {
    renderMatchup({ pathname: "/matchup/not-a-game" });

    const loading = screen.getByTestId("game-details-loading");
    expect(loading.textContent).toBe("Preparing game analysis");
    expect(loading.querySelector("img")).toBeNull();
    expect(document.title).toBe(DEFAULT_DOCUMENT_TITLE);
  });

  it("restores the default title when leaving the page", () => {
    const { unmount } = renderMatchup({ pathname: "/matchup/20261101_ATL%40TB" });
    expect(document.title).toBe("ATL @ TB · Nov 1, 2026 | GameLens");
    unmount();
    expect(document.title).toBe(DEFAULT_DOCUMENT_TITLE);
  });
});
