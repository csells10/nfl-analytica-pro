import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));

import MatchupLens from "@/pages/MatchupLens";

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

async function overview() {
  await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());
}

describe("Matchup Dashboard overview", () => {
  it("shows only the compact orientation surface", async () => {
    renderPage();
    await overview();

    expect(screen.getByTestId("lens-context-label").textContent).toBe(
      "Preseason-to-date · as of 2026-08-23 · LAR 2 games / CLE 2 games",
    );
    expect(screen.getByTestId("matchup-context-bar")).toBeTruthy();
    expect(screen.getByTestId("insight-ticker")).toBeTruthy();
    expect(screen.getByTestId("game-brief")).toBeTruthy();
    expect(screen.getByTestId("destination-cards")).toBeTruthy();

    // Deep analysis stays behind explicit choices.
    expect(screen.queryByTestId("lens-constellation")).toBeNull();
    expect(screen.queryByTestId("lens-evidence")).toBeNull();
    expect(screen.queryByTestId("collision-preview")).toBeNull();
    expect(screen.queryByTestId("matchup-collision")).toBeNull();
    expect(screen.queryByTestId("top-profile-gaps")).toBeNull();
    expect(screen.queryByTestId("trace-network")).toBeNull();
    expect(screen.queryByTestId("trace-packed")).toBeNull();
    expect(screen.queryByTestId("lens-rail")).toBeNull();
    expect(screen.queryByTestId("insight-cards")).toBeNull();
  });

  it("drops the retired experiences and keeps Momentum gated", async () => {
    renderPage();
    await overview();

    expect(screen.queryByTestId("experience-launcher")).toBeNull();
    expect(screen.queryByText("Team Fingerprint")).toBeNull();
    expect(screen.queryByText("Matchup Map")).toBeNull();
    expect(screen.queryByText("Lens Portrait")).toBeNull();
    expect(screen.queryByText("Lens Galaxy")).toBeNull();
    expect(screen.queryByText("Event Pulse")).toBeNull();
    expect(screen.queryByTestId("momentum-shift")).toBeNull();
  });

  it("cycles deterministic ticker stories and routes the CTA to a focused view", async () => {
    const user = userEvent.setup();
    renderPage();
    await overview();

    const count = screen.getByTestId("ticker-count").textContent ?? "";
    expect(count).toMatch(/^1 of \d+$/);
    const first = screen.getByTestId("ticker-story").textContent;

    await user.click(screen.getByRole("button", { name: /next story/i }));
    expect(screen.getByTestId("ticker-count").textContent).toMatch(/^2 of \d+$/);
    expect(screen.getByTestId("ticker-story").textContent).not.toBe(first);

    await user.click(screen.getByRole("button", { name: /previous story/i }));
    expect(screen.getByTestId("ticker-story").textContent).toBe(first);

    await user.click(screen.getByTestId("ticker-cta"));
    await waitFor(() =>
      expect(
        screen.queryByTestId("lens-evidence") ?? screen.queryByTestId("matchup-collision"),
      ).toBeTruthy(),
    );
    expect(screen.queryByTestId("destination-cards")).toBeNull();
  });

  it("opens a focused lens view from a brief observation and updates sticky context", async () => {
    const user = userEvent.setup();
    renderPage();
    await overview();

    const rows = screen.getByTestId("brief-observations").querySelectorAll("button");
    expect(rows.length).toBeGreaterThan(0);
    await user.click(rows[0] as HTMLButtonElement);

    await waitFor(() =>
      expect(
        screen.queryByTestId("lens-evidence") ?? screen.queryByTestId("matchup-collision"),
      ).toBeTruthy(),
    );
    // The overview content is replaced, not appended to.
    expect(screen.queryByTestId("game-brief")).toBeNull();
    expect(screen.getByTestId("context-viewing").textContent).not.toMatch(/Overview/);
    expect(screen.getByTestId("view-announcement").textContent).toMatch(/Viewing/);

    await user.click(screen.getByTestId("context-back"));
    await waitFor(() => expect(screen.getByTestId("game-brief")).toBeTruthy());
    expect(screen.getByTestId("context-viewing").textContent).toMatch(/Overview/);
  });

  it("routes every destination card to its focused view", async () => {
    const user = userEvent.setup();
    renderPage();
    await overview();

    await user.click(screen.getByTestId("destination-open-constellation"));
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());
    expect(screen.queryByTestId("destination-cards")).toBeNull();

    await user.click(screen.getByTestId("journey-back"));
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());

    await user.click(screen.getByTestId("destination-open-lenses"));
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());

    await user.click(screen.getByTestId("journey-back"));
    await user.click(screen.getByTestId("destination-open-collision"));
    await waitFor(() => expect(screen.getByTestId("matchup-collision")).toBeTruthy());

    await user.click(screen.getByTestId("journey-back"));
    await user.click(screen.getByTestId("destination-open-biggest-edge"));
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
  });

  it("honours a deep link with teams, view and lens", async () => {
    renderPage("/matchup-lens?a=KC&b=WAS&view=lens&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(
      "turnover-balance",
    );
    expect(screen.getAllByText(/Turnover Balance/).length).toBeGreaterThan(0);
  });

  it("maps legacy mode links forward without breaking", async () => {
    renderPage("/matchup-lens?a=LAR&b=CLE&mode=fingerprint");
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());
    expect(screen.getByTestId("lens-constellation").getAttribute("data-layout")).toBe("side");
    expect(screen.getByTestId("constellation-side")).toBeTruthy();
  });

  it("never shows raw weighting jargon or forecast language", async () => {
    renderPage("/matchup-lens?view=lens&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/weighted percentile/i);
    expect(text).not.toMatch(/strong · w2|strong-w0/);
    expect(text).not.toMatch(/probability/i);
  });
});
