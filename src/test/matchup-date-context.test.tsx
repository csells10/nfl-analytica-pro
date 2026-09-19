import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io", name: "QA" }, signOut: vi.fn() }),
}));
vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", toggle: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));
vi.mock("@/lib/firebase", () => ({ getAuthToken: async () => "test-token", firebaseAuth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn(async () => undefined) }));

import Slate from "@/pages/Slate";
import MatchupLens from "@/pages/MatchupLens";
import {
  buildMatchupLensHref,
  isValidFromDate,
  matchupsHref,
} from "@/lib/matchup-lens-link";
import { installLensFetchMock, withGame, type LensFetchMock } from "./matchup-lens-live-harness";

const SELECTED_DATE = "2026-09-24";

function CurrentLocation() {
  const location = useLocation();
  return <span data-testid="current-location">{`${location.pathname}${location.search}`}</span>;
}

// ---------------------------------------------------------------------------
// Validation + builders

describe("fromDate navigation context validation", () => {
  it.each(["2026-09-24", "2026-02-28", "2024-02-29"])("accepts the real date %s", (date) => {
    expect(isValidFromDate(date)).toBe(true);
    expect(matchupsHref(date)).toBe(`/?date=${date}`);
  });

  it.each(["", "2026-9-4", "2026-13-01", "2026-02-30", "banana", "2026-09-24T00:00", null, undefined])(
    "ignores the unusable value %s",
    (date) => {
      expect(isValidFromDate(date as string | null)).toBe(false);
      expect(matchupsHref(date as string | null)).toBe("/");
      expect(buildMatchupLensHref("g1", "DET", "BUF", date as string | null)).not.toContain(
        "fromDate",
      );
    },
  );

  it("adds a valid date to the shared Lab link without changing existing links", () => {
    expect(buildMatchupLensHref("g1", "DET", "BUF")).toBe(
      "/matchup-lens?a=DET&b=BUF&view=overview&game=g1",
    );
    expect(buildMatchupLensHref("g1", "DET", "BUF", SELECTED_DATE)).toBe(
      `/matchup-lens?a=DET&b=BUF&view=overview&game=g1&fromDate=${SELECTED_DATE}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Matchups -> Matchup Lab

function scheduleBody(date: string) {
  return JSON.stringify({
    date,
    games: [
      {
        gameID: `${date.replace(/-/g, "")}_DET@BUF`,
        gameTime: "1:00 PM ET",
        away: "DET",
        home: "BUF",
        gameStatus: "Scheduled",
      },
    ],
  });
}

describe("Matchups carries its selected date into the Lab", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const date = new URL(String(input)).searchParams.get("date") ?? "";
        return new Response(scheduleBody(date), { status: 200 });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the selected date through as fromDate and never auto-replaces it", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/?date=${SELECTED_DATE}`]}>
          <CurrentLocation />
          <Routes>
            <Route path="/" element={<Slate />} />
            <Route path="/matchup-lens" element={<span>lab</span>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const action = await screen.findByTestId("open-in-matchup-lens");
    // The URL-provided date is respected, not replaced by the seven-day lookup.
    expect(screen.getByTestId("current-location").textContent).toBe(`/?date=${SELECTED_DATE}`);

    await userEvent.click(action);
    await waitFor(() =>
      expect(screen.getByTestId("current-location").textContent).toContain(
        `fromDate=${SELECTED_DATE}`,
      ),
    );
  });

  it("keeps the selected date and quietly marks the game returned from", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[{
            pathname: "/",
            search: `?date=${SELECTED_DATE}`,
            state: { returningFromGame: "20260924_DET@BUF" },
          }]}
        >
          <Routes>
            <Route path="/" element={<Slate />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(document.querySelector('[data-returned-game="true"]')).toBeTruthy());
    const returned = document.querySelector('[data-returned-game="true"]');
    expect(returned?.className).toContain("animate-returned-game");
    expect(returned?.className).toContain("motion-reduce:animate-none");
    expect(screen.getByText("September 24, 2026")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Inside the Lab

describe("Matchup Lab keeps the return date", () => {
  let fetchMock: LensFetchMock | null = null;
  beforeEach(() => {
    fetchMock = installLensFetchMock();
  });
  afterEach(() => {
    fetchMock?.restore();
    fetchMock = null;
  });

  function renderLab(entry: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[withGame(entry)]}>
          <CurrentLocation />
          <MatchupLens />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  const matchupsLink = () =>
    (screen.getAllByRole("link", { name: /Matchups/i })[0] as HTMLAnchorElement).getAttribute(
      "href",
    );

  it("points the Matchups destination at the originating date on a fresh render", async () => {
    renderLab(`/matchup-lens?view=overview&fromDate=${SELECTED_DATE}`);
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    expect(matchupsLink()).toBe(`/?date=${SELECTED_DATE}`);
  });

  it("preserves fromDate when the Lab view changes", async () => {
    renderLab(`/matchup-lens?view=overview&fromDate=${SELECTED_DATE}`);
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await userEvent.click(screen.getByTestId("destination-open-lenses"));
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());

    expect(screen.getByTestId("current-location").textContent).toContain(
      `fromDate=${SELECTED_DATE}`,
    );
    expect(matchupsLink()).toBe(`/?date=${SELECTED_DATE}`);
  });

  it.each(["", "&fromDate=2026-02-30", "&fromDate=nope"])(
    "falls back to the plain Matchups route for %s",
    async (suffix) => {
      renderLab(`/matchup-lens?view=overview${suffix}`);
      await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
      expect(matchupsLink()).toBe("/");
    },
  );

  it("leaves the authenticated request untouched by the navigation context", async () => {
    renderLab(`/matchup-lens?view=overview&fromDate=${SELECTED_DATE}`);
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    for (const url of fetchMock!.calls()) {
      expect(url).not.toContain("fromDate");
      expect(url).not.toContain(SELECTED_DATE);
    }
  });
});
