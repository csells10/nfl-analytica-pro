import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));

import MatchupLens from "@/pages/MatchupLens";
import { originReturn, parseOrigin } from "@/lib/matchup-lens-view";

function renderPage(initialEntry = "/matchup-lens") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MatchupLens />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("origin state", () => {
  it("maps every origin to a single return target and falls back safely", () => {
    expect(parseOrigin("all-lenses")).toBe("all-lenses");
    expect(parseOrigin("nonsense")).toBe("overview");
    expect(originReturn("constellation").view).toBe("constellation");
    expect(originReturn("all-lenses").label).toBe("Back to all lenses");
    expect(originReturn("ticker").view).toBe("overview");
  });
});

describe("Matchup Dashboard journey", () => {
  it("returns to the constellation when the lens was opened from it", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=constellation");
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());

    const tile = screen
      .getByTestId("lens-constellation")
      .querySelector("button[data-lens-key]") as HTMLButtonElement;
    await user.click(tile);

    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    expect(screen.getByTestId("journey-back").textContent).toMatch(/Back to Constellation/);
    // Exactly one contextual back action inside the canvas.
    expect(screen.queryAllByTestId("journey-back").length).toBe(1);

    await user.click(screen.getByTestId("journey-back"));
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());
  });

  it("keeps the Overview escape in the sticky bar only on focused views", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    expect(screen.queryByTestId("context-back")).toBeNull();

    await user.click(screen.getByTestId("destination-open-lenses"));
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());
    expect(screen.getByTestId("context-back")).toBeTruthy();
  });

  it("switches lenses in place from the focused lens detail", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=lens&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());

    await user.click(screen.getByTestId("journey-next-lens"));
    await waitFor(() =>
      expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).not.toBe(
        "turnover-balance",
      ),
    );
    expect(screen.getByTestId("journey-lens-select")).toBeTruthy();
  });

  it("offers next paths after the evidence and follows them", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=lens&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("continue-exploring")).toBeTruthy());

    await user.click(screen.getByTestId("continue-collision"));
    await waitFor(() => expect(screen.getByTestId("matchup-collision")).toBeTruthy());
    // The current view is never offered as its own next step.
    expect(screen.queryByTestId("continue-collision")).toBeNull();
  });
});

describe("Insight ticker auto-advance", () => {
  afterEach(() => vi.useRealTimers());

  it("advances on a calm cadence and stops for manual control", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("true");
    const first = screen.getByTestId("ticker-story").getAttribute("data-story-id");

    await act(async () => {
      vi.advanceTimersByTime(8200);
    });
    expect(screen.getByTestId("ticker-story").getAttribute("data-story-id")).not.toBe(first);

    await user.click(screen.getByTestId("ticker-playpause"));
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("false");
    const paused = screen.getByTestId("ticker-story").getAttribute("data-story-id");
    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByTestId("ticker-story").getAttribute("data-story-id")).toBe(paused);
    vi.useRealTimers();
  });

  it("stops auto-advance permanently after manual navigation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /next story/i }));
    const manual = screen.getByTestId("ticker-story").getAttribute("data-story-id");
    expect(screen.getByTestId("insight-ticker").getAttribute("data-playing")).toBe("false");
    expect(screen.getByTestId("ticker-status").textContent).toMatch(/Story \d of \d/);

    await act(async () => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByTestId("ticker-story").getAttribute("data-story-id")).toBe(manual);
    vi.useRealTimers();
  });
});

describe("Matchup Dashboard lifecycle states", () => {
  it("shows a page-shaped skeleton before data arrives", async () => {
    renderPage();
    expect(screen.getByTestId("dashboard-skeleton")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    expect(screen.queryByTestId("dashboard-skeleton")).toBeNull();
  });
});
