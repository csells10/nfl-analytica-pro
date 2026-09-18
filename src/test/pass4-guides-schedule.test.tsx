import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { addDays, format } from "date-fns";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io", name: "QA" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));
vi.mock("@/lib/firebase", () => ({ getAuthToken: async () => "test-token", firebaseAuth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn(async () => undefined) }));

import Slate from "@/pages/Slate";
import { GUIDE_STORAGE_KEYS, guideIdForPath } from "@/lib/guides";

const TODAY = new Date();
const day = (offset: number) => format(addDays(TODAY, offset), "yyyy-MM-dd");

function gamesBody(date: string, count: number) {
  return JSON.stringify({
    date,
    games: Array.from({ length: count }, (_, i) => ({
      gameID: `${date.replace(/-/g, "")}_AAA@BBB${i}`,
      gameTime: "1:00 PM ET",
      away: "DET",
      home: "BUF",
      gameStatus: "Scheduled",
    })),
  });
}

/** Per-date schedule responses: number = games, "fail" = failed request. */
function installScheduleMock(plan: Record<string, number | "fail">) {
  const original = globalThis.fetch;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const date = new URL(url).searchParams.get("date") ?? "";
    const entry = plan[date] ?? 0;
    if (entry === "fail") {
      return new Response("upstream failure", { status: 500 });
    }
    return new Response(gamesBody(date, entry), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    fetchMock,
    restore: () => {
      vi.stubGlobal("fetch", original);
    },
  };
}

function CurrentLocation() {
  const location = useLocation();
  return <span data-testid="current-location">{`${location.pathname}${location.search}`}</span>;
}

function renderSlate(entry = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Slate />
                <CurrentLocation />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let restoreFetch: (() => void) | null = null;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
  vi.unstubAllGlobals();
});

describe("route-aware guide ids", () => {
  it("maps each route to exactly one guide and nothing else", () => {
    expect(guideIdForPath("/")).toBe("matchups");
    expect(guideIdForPath("/matchup/20260917_DET%40BUF")).toBe("game-detail");
    expect(guideIdForPath("/matchup-lens")).toBe("matchup-lab");
    expect(guideIdForPath("/settings")).toBeNull();
    expect(guideIdForPath("/admin/claim-health")).toBeNull();
  });

  it("keeps the existing game-detail guide key unchanged", () => {
    expect(GUIDE_STORAGE_KEYS["game-detail"]).toBe("hasSeenMatchupSectionSpotlightTour");
    expect(GUIDE_STORAGE_KEYS.matchups).toBe("gamelens.guide.matchups.v1");
    expect(GUIDE_STORAGE_KEYS["matchup-lab"]).toBe("gamelens.guide.matchup-lab.v1");
  });
});

describe("Matchups guide", () => {
  it("auto-opens once for its versioned key and never reopens by itself", async () => {
    restoreFetch = installScheduleMock({ [day(0)]: 2 }).restore;
    const first = renderSlate();
    await screen.findByTestId("matchups-guide");
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(localStorage.getItem(GUIDE_STORAGE_KEYS.matchups)).toBe("true");
    first.unmount();

    renderSlate();
    await waitFor(() => expect(screen.queryByTestId("matchups-guide")).toBeNull());
  });

  it("reopens from Help after completion, and no Lab guide opens with it", async () => {
    localStorage.setItem(GUIDE_STORAGE_KEYS.matchups, "true");
    restoreFetch = installScheduleMock({ [day(0)]: 2 }).restore;
    renderSlate();
    await waitFor(() => expect(screen.queryByTestId("matchups-guide")).toBeNull());

    await userEvent.click(screen.getByRole("button", { name: "Open guide" }));
    await screen.findByTestId("matchups-guide");
    expect(screen.queryByTestId("matchup-lab-guide")).toBeNull();
  });

  it("does not use the retired single-date tutorial key", async () => {
    localStorage.setItem("hasSeenDateTutorial", "true");
    restoreFetch = installScheduleMock({ [day(0)]: 1 }).restore;
    renderSlate();
    await screen.findByTestId("matchups-guide");
  });
});

describe("seven-day schedule lookup", () => {
  it("selects the earliest discovered date with games on a normal visit", async () => {
    restoreFetch = installScheduleMock({ [day(0)]: 0, [day(1)]: 0, [day(3)]: 2 }).restore;
    renderSlate();

    await waitFor(() =>
      expect(screen.getByTestId("current-location").textContent).toBe(`/?date=${day(3)}`),
    );
  });

  it("keeps today selected when today has games", async () => {
    restoreFetch = installScheduleMock({ [day(0)]: 3, [day(2)]: 2 }).restore;
    renderSlate();

    await screen.findByText("3 games");
    expect(screen.getByTestId("current-location").textContent).toBe("/");
  });

  it("never automatically replaces a date supplied in the URL", async () => {
    const target = day(2);
    restoreFetch = installScheduleMock({ [target]: 0, [day(4)]: 2 }).restore;
    renderSlate(`/?date=${target}`);

    await screen.findByTestId("slate-empty");
    expect(screen.getByTestId("current-location").textContent).toBe(`/?date=${target}`);
  });

  it("offers a discovered date when the selected date is empty", async () => {
    const target = day(1);
    restoreFetch = installScheduleMock({ [target]: 0, [day(5)]: 2 }).restore;
    renderSlate(`/?date=${target}`);

    const suggestion = await screen.findByTestId("slate-suggestion");
    expect(suggestion.textContent).toContain(format(addDays(TODAY, 5), "EEEE, MMMM d"));
  });

  it("does not claim an empty week when a scanned date failed", async () => {
    restoreFetch = installScheduleMock({ [day(0)]: 0, [day(2)]: "fail" }).restore;
    renderSlate(`/?date=${day(0)}`);

    const empty = await screen.findByTestId("slate-empty");
    await waitFor(() =>
      expect(empty.textContent).toContain("No NFL games are scheduled for this date."),
    );
    expect(empty.textContent).not.toContain("next seven days");
  });

  it("says the window is empty only when all seven dates loaded without games", async () => {
    restoreFetch = installScheduleMock({}).restore;
    renderSlate(`/?date=${day(0)}`);

    const empty = await screen.findByTestId("slate-empty");
    await waitFor(() =>
      expect(empty.textContent).toContain("No games found in the next seven days."),
    );
    expect(screen.queryByTestId("slate-suggestion")).toBeNull();
  });
});
