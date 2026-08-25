import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));

import MatchupLens from "@/pages/MatchupLens";
import { buildGameBrief } from "@/lib/matchup-lens-brief";
import { findTeam } from "@/lib/matchup-lens";
import { PRESEASON_2026_SNAPSHOT } from "@/lib/matchup-lens-snapshot";
import {
  getLensSnapshotSource,
  setLensSnapshotSource,
  staticLensSnapshotSource,
} from "@/lib/matchup-lens-source";
import type { LensSnapshot } from "@/lib/matchup-lens-types";
import { DASHBOARD_ERROR_MESSAGE } from "@/components/matchup-lens/DashboardStates";

// Radix Select needs these pointer APIs, which jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  setLensSnapshotSource(staticLensSnapshotSource);
  vi.useRealTimers();
});

function renderPage(entry = "/matchup-lens") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/matchup-lens", element: <MatchupLens /> }], {
    initialEntries: [entry],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

type Router = ReturnType<typeof renderPage>;

function params(router: Router): URLSearchParams {
  return new URLSearchParams(router.state.location.search);
}

async function goBack(router: Router) {
  await act(async () => {
    await router.navigate(-1);
  });
}

function largestGapKey(awayAbv: string, homeAbv: string): string {
  const snapshot = PRESEASON_2026_SNAPSHOT;
  const teamA = findTeam(snapshot, awayAbv)!;
  const teamB = findTeam(snapshot, homeAbv)!;
  const brief = buildGameBrief(snapshot, teamA, teamB, awayAbv, homeAbv, awayAbv, homeAbv);
  return brief.largest!.key;
}

/** Pick a team from one of the Overview matchup selectors. */
async function pickTeam(
  user: ReturnType<typeof userEvent.setup>,
  role: "Team A team" | "Team B team",
  abv: string,
) {
  await user.click(screen.getByRole("combobox", { name: role }));
  const option = await screen.findByRole("option", { name: new RegExp(`^${abv} ·`) });
  await user.click(option);
}

describe("browser history continuity", () => {
  it("restores the previous canvas on browser Back", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const router = renderPage();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await user.click(screen.getByTestId("destination-open-constellation"));
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());

    const tile = screen
      .getByTestId("lens-constellation")
      .querySelector('button[data-lens-key="scoring-finish"]') as HTMLButtonElement;
    await user.click(tile);
    await waitFor(() =>
      expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(
        "scoring-finish",
      ),
    );

    await goBack(router);
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());
    expect(params(router).get("view")).toBe("constellation");

    await goBack(router);
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    expect(params(router).get("view") ?? "overview").toBe("overview");
  });

  it("rehydrates lens, origin and collision state from a forward navigation", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const router = renderPage();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await user.click(screen.getByTestId("destination-open-lenses"));
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());

    await goBack(router);
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await act(async () => {
      await router.navigate(1);
    });
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());
    expect(params(router).get("view")).toBe("lenses");
  });
});

describe("matchup changes", () => {
  it("returns to the Overview and clears every focused state", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const router = renderPage(
      "/matchup-lens?view=lens&lens=turnover-balance&from=all-lenses&trace=metric:points_per_game",
    );
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());

    await user.click(screen.getByTestId("context-change-matchup"));
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await pickTeam(user, "Team B team", "KC");

    await waitFor(() => expect(params(router).get("b")).toBe("KC"));
    const search = params(router);
    expect(search.get("view")).toBe("overview");
    expect(search.get("lens")).toBeNull();
    expect(search.get("collision")).toBeNull();
    expect(search.get("trace")).toBeNull();
    expect(search.get("from")).toBeNull();
    expect(screen.queryByTestId("lens-evidence")).toBeNull();
    expect(screen.getByTestId("lens-context-label").textContent).toMatch(/KC/);
  });
  it("clears focused state as soon as Change matchup is used", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const router = renderPage(
      "/matchup-lens?view=lens&lens=turnover-balance&from=all-lenses&layout=side&trace=metric:takeaways_per_game",
    );
    await waitFor(() => expect(screen.getByTestId("trace-drawer")).toBeTruthy());

    await user.click(screen.getByTestId("context-change-matchup"));

    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    const search = params(router);
    expect(search.get("view")).toBe("overview");
    expect(search.get("lens")).toBeNull();
    expect(search.get("collision")).toBeNull();
    expect(search.get("trace")).toBeNull();
    expect(search.get("layout")).toBeNull();
    expect(search.get("from")).toBeNull();
    expect(screen.queryByTestId("trace-drawer")).toBeNull();
    expect(screen.queryByTestId("lens-evidence")).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Team A team" })),
    );
  });
});

describe("biggest edge", () => {
  it("always opens the current matchup's largest separation", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const router = renderPage();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    const expected = largestGapKey("LAR", "CLE");
    const other = expected === "turnover-balance" ? "explosiveness" : "turnover-balance";

    // Open a non-largest lens first, then return to the Overview.
    await user.click(screen.getByTestId("destination-open-lenses"));
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());
    await user.click(
      screen.getByTestId("lens-explorer").querySelector(`[data-lens-key="${other}"]`) as HTMLElement,
    );
    await waitFor(() =>
      expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(other),
    );
    await user.click(screen.getByTestId("context-back"));
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await user.click(screen.getByTestId("destination-open-biggest-edge"));
    await waitFor(() =>
      expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(expected),
    );
    expect(params(router).get("lens")).toBe(expected);

    // …and again after the matchup changes.
    await user.click(screen.getByTestId("context-change-matchup"));
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    await pickTeam(user, "Team B team", "KC");
    await waitFor(() => expect(params(router).get("b")).toBe("KC"));

    const nextExpected = largestGapKey("LAR", "KC");
    await user.click(screen.getByTestId("destination-open-biggest-edge"));
    await waitFor(() =>
      expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(nextExpected),
    );
    expect(params(router).get("lens")).toBe(nextExpected);
  });
});

describe("deep-link normalisation", () => {
  it("drops a collision lane that does not exist and does not add history", async () => {
    const router = renderPage("/matchup-lens?view=collision&collision=not-a-lane");
    await waitFor(() => expect(screen.getByTestId("matchup-collision")).toBeTruthy());
    await waitFor(() => expect(params(router).get("collision")).toBeNull());
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("normalises unavailable momentum back to the Overview by replacing", async () => {
    const router = renderPage("/matchup-lens?view=momentum&from=constellation");
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    expect(params(router).get("view")).toBe("overview");
    expect(params(router).get("from")).toBeNull();
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("drops a trace id that has no evidence in the snapshot", async () => {
    const router = renderPage("/matchup-lens?view=lens&lens=turnover-balance&trace=metric:not_a_metric");
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    await waitFor(() => expect(params(router).get("trace")).toBeNull());
    expect(screen.queryByTestId("trace-drawer")).toBeNull();
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("drops an unknown tag trace id as well", async () => {
    const router = renderPage("/matchup-lens?view=lens&lens=turnover-balance&trace=tag:not_a_tag");
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    await waitFor(() => expect(params(router).get("trace")).toBeNull());
    expect(screen.queryByTestId("trace-drawer")).toBeNull();
  });

  it("falls back to the default matchup for unknown teams, views and origins", async () => {
    const router = renderPage("/matchup-lens?a=ZZZ&b=ZZZ&view=nonsense&from=nowhere&lens=bogus");
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    const search = params(router);
    expect(search.get("a")).toBe("LAR");
    expect(search.get("b")).toBe("CLE");
    expect(search.get("view")).toBe("overview");
    expect(search.get("lens")).toBeNull();
    expect(router.state.historyAction).toBe("REPLACE");
  });
});

describe("lifecycle states", () => {
  it("shows the loading skeleton before data arrives", async () => {
    renderPage();
    expect(screen.getByTestId("dashboard-skeleton")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
  });

  it("shows a background refresh status without replacing the canvas", async () => {
    let resolveSecond: ((snapshot: LensSnapshot) => void) | undefined;
    let calls = 0;
    setLensSnapshotSource({
      id: "refresh-test",
      load: () => {
        calls += 1;
        if (calls === 1) return Promise.resolve(PRESEASON_2026_SNAPSHOT);
        return new Promise<LensSnapshot>((resolve) => {
          resolveSecond = resolve;
        });
      },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter([{ path: "/matchup-lens", element: <MatchupLens /> }], {
      initialEntries: ["/matchup-lens"],
    });
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await act(async () => {
      void client.refetchQueries({ queryKey: ["lens-snapshot", "refresh-test"] });
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId("context-refreshing")).toBeTruthy());
    expect(screen.getByTestId("destination-cards")).toBeTruthy();

    await act(async () => {
      resolveSecond?.(PRESEASON_2026_SNAPSHOT);
    });
    await waitFor(() => expect(screen.queryByTestId("context-refreshing")).toBeNull());
  });

  it("shows plain-language error copy and retries without echoing the error", async () => {
    let attempts = 0;
    setLensSnapshotSource({
      id: "error-test",
      load: () => {
        attempts += 1;
        if (attempts === 1) {
          return Promise.reject(new Error("ECONNREFUSED 10.0.0.4:5432 internal-db"));
        }
        return Promise.resolve(PRESEASON_2026_SNAPSHOT);
      },
    });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("dashboard-error")).toBeTruthy());
    const errorCard = screen.getByTestId("dashboard-error");
    expect(errorCard.textContent).toContain(DASHBOARD_ERROR_MESSAGE);
    expect(errorCard.textContent).not.toMatch(/ECONNREFUSED|10\.0\.0\.4|internal-db/);

    await user.click(screen.getByTestId("dashboard-retry"));
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it("shows the empty state when the snapshot has no rows for the matchup", async () => {
    const emptySnapshot: LensSnapshot = {
      ...PRESEASON_2026_SNAPSHOT,
      teams: [],
    };
    setLensSnapshotSource({ id: "empty-test", load: async () => emptySnapshot });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("dashboard-empty")).toBeTruthy());
    expect(screen.getByTestId("dashboard-empty").textContent).toMatch(/No profile data/);
    expect(screen.queryByTestId("destination-cards")).toBeNull();
  });
});

describe("insight ticker accessibility", () => {
  it("stays paused with no transitions under reduced motion", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const original = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    try {
      renderPage();
      await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());
      const ticker = screen.getByTestId("insight-ticker");
      expect(ticker.getAttribute("data-reduced-motion")).toBe("true");
      expect(ticker.getAttribute("data-playing")).toBe("false");
      expect(screen.getByTestId("ticker-story").className).not.toMatch(/transition-/);
      expect(
        (screen.getByTestId("ticker-playpause") as HTMLButtonElement).disabled,
      ).toBe(true);

      const first = screen.getByTestId("ticker-story").getAttribute("data-story-id");
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });
      expect(screen.getByTestId("ticker-story").getAttribute("data-story-id")).toBe(first);
    } finally {
      Object.defineProperty(window, "matchMedia", { writable: true, value: original });
      vi.useRealTimers();
    }
  });

  it("pauses while the document is hidden and resumes when visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("true");

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const paused = screen.getByTestId("ticker-story").getAttribute("data-story-id");
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("false");
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByTestId("ticker-story").getAttribute("data-story-id")).toBe(paused);

    hidden.mockReturnValue(false);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("true");
    hidden.mockRestore();
    vi.useRealTimers();
  });

  it("keeps progress silent and only announces manual changes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    const progress = screen.getByTestId("ticker-progress");
    expect(progress.getAttribute("aria-hidden")).toBe("true");
    expect(progress.getAttribute("data-active")).toBe("true");
    expect(Number(progress.getAttribute("data-progress"))).toBe(0);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(Number(screen.getByTestId("ticker-progress").getAttribute("data-progress"))).toBeGreaterThan(0);
    // Automatic changes are never announced.
    expect(screen.getByTestId("ticker-status").textContent).toBe("");
    vi.useRealTimers();
  });

  it("resumes automatic changes from an explicit Play click", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, pointerEventsCheck: 0 });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    await user.click(screen.getByTestId("ticker-playpause"));
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("false");

    await user.click(screen.getByTestId("ticker-playpause"));
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("true");

    const before = screen.getByTestId("ticker-story").getAttribute("data-story-id");
    await act(async () => {
      vi.advanceTimersByTime(8400);
    });
    expect(screen.getByTestId("ticker-story").getAttribute("data-story-id")).not.toBe(before);
    vi.useRealTimers();
  });
});

describe("mobile layout semantics", () => {
  it("makes destination cards a snap carousel below sm and a grid at sm+", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    const track = screen.getByTestId("destination-cards").querySelector("div.snap-x") as HTMLElement;
    expect(track.className).toMatch(/overflow-x-auto/);
    expect(track.className).toMatch(/snap-mandatory/);
    expect(track.className).toMatch(/sm:grid/);
    expect(track.className).toMatch(/sm:overflow-visible/);

    const card = track.querySelector("[data-destination]") as HTMLElement;
    expect(card.className).toMatch(/snap-start/);
    expect(card.className).toMatch(/sm:min-w-0/);

    const open = within(card).getByRole("button", { name: /open/i });
    expect(open.className).toMatch(/min-h-\[44px\]/);
  });

  it("lets the lens selector row wrap onto its own line on mobile", async () => {
    renderPage("/matchup-lens?view=lens&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("journey-lens-select")).toBeTruthy());

    expect(screen.getByTestId("journey-nav").className).toMatch(/flex-wrap/);
    const row = screen.getByTestId("journey-lens-row");
    expect(row.className).toMatch(/w-full/);
    expect(row.className).toMatch(/sm:w-auto/);
    expect(row.className).toMatch(/flex-wrap/);

    const trigger = screen.getByTestId("journey-lens-select");
    expect(trigger.className).toMatch(/flex-1/);
    expect(trigger.className).toMatch(/sm:w-\[13\.5rem\]/);
    expect(trigger.className).not.toMatch(/(^|\s)w-\[13\.5rem\]/);
  });
});
