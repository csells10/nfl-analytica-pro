import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { GameDetails } from "@/lib/nfl-api";

const mocks = vi.hoisted(() => ({
  details: undefined as GameDetails | undefined,
  gameId: "" as string | undefined,
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
    useGameDetails: (gameId: string | undefined) => {
      mocks.gameId = gameId;
      return {
        data: mocks.details,
        isLoading: !mocks.details,
        isFetching: !mocks.details,
        isError: false,
        error: null,
      };
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

function renderMatchup() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/matchup/20260920_NO%40BAL",
          search: "?date=2026-09-20",
          state: {
            fromDate: "2026-09-20",
            game: {
              id: "20260920_NO@BAL",
              date: "September 20, 2026",
              time: "1:00 PM ET",
              awayTeam: "NYG",
              homeTeam: "DET",
              awayFullName: "NYG",
              homeFullName: "DET",
              week: 2,
              status: "Scheduled",
            },
          },
        },
      ]}
    >
      <Routes>
        <Route path="/matchup/:id" element={<Matchup />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.details = undefined;
  mocks.gameId = "";
  localStorage.setItem("hasSeenMatchupSectionSpotlightTour", "true");
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("Game Details route loading transition", () => {
  it("uses navigation identity only while the route request is pending", () => {
    renderMatchup();

    expect(mocks.gameId).toBe("20260920_NO@BAL");
    expect(screen.getByTestId("game-details-loading")).toBeTruthy();
    expect(screen.getByText("New York Giants")).toBeTruthy();
    expect(screen.getByText("Detroit Lions")).toBeTruthy();
    expect(screen.queryByText("Matchup Lean")).toBeNull();
  });

  it("replaces temporary navigation identity with canonical backend teams", () => {
    mocks.details = canonicalDetails;
    renderMatchup();

    expect(screen.queryByTestId("game-details-loading")).toBeNull();
    expect(screen.getByText("New Orleans Saints")).toBeTruthy();
    expect(screen.getByText("Baltimore Ravens")).toBeTruthy();
    expect(screen.queryByText("New York Giants")).toBeNull();
    expect(screen.queryByText("Detroit Lions")).toBeNull();
    expect(screen.getByTestId("game-details-content").className).toContain("motion-reduce:animate-none");
  });
});