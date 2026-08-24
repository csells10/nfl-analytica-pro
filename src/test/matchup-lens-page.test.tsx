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

describe("Matchup Dashboard default view", () => {
  it("lands on the overview dashboard with header, rail, cards and hero", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-rail")).toBeTruthy());

    expect(screen.getByTestId("lens-context-label").textContent).toBe(
      "Preseason-to-date · as of 2026-08-23 · LAR 2 games / CLE 2 games",
    );
    expect(screen.getByTestId("insight-cards")).toBeTruthy();
    expect(screen.getByTestId("game-brief")).toBeTruthy();
    expect(screen.getByTestId("lens-constellation")).toBeTruthy();
    expect(screen.getByTestId("collision-preview")).toBeTruthy();
    expect(screen.getByTestId("top-profile-gaps")).toBeTruthy();
    expect(screen.getAllByText(/Los Angeles Rams/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cleveland Browns/).length).toBeGreaterThan(0);
  });

  it("drops the old experience launcher and the retired experiences", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-rail")).toBeTruthy());

    expect(screen.queryByTestId("experience-launcher")).toBeNull();
    expect(screen.queryByText("Team Fingerprint")).toBeNull();
    expect(screen.queryByText("Matchup Map")).toBeNull();
    expect(screen.queryByText("Lens Portrait")).toBeNull();
    expect(screen.queryByText("Lens Galaxy")).toBeNull();
    expect(screen.queryByText("Event Pulse")).toBeNull();
    expect(screen.queryByTestId("momentum-shift")).toBeNull();
  });

  it("shows largest separation and closest lens exactly once", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-cards")).toBeTruthy());

    expect(screen.getAllByText("Largest separation")).toHaveLength(1);
    expect(screen.getAllByText("Closest lens")).toHaveLength(1);
  });

  it("opens no lens evidence until a lens is deliberately selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-rail")).toBeTruthy());
    expect(screen.queryByTestId("lens-evidence")).toBeNull();

    const rail = screen.getByTestId("lens-rail");
    const item = rail.querySelector(
      'button[data-lens-key="turnover-balance"]',
    ) as HTMLButtonElement;
    await user.click(item);

    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(
      "turnover-balance",
    );
    expect(screen.getByTestId("evidence-rail")).toBeTruthy();
  });

  it("honours a deep link with teams, view and lens", async () => {
    renderPage("/matchup-lens?a=KC&b=WAS&view=overview&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("game-brief")).toBeTruthy());
    expect(screen.getAllByText(/Kansas City Chiefs/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Washington Commanders/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Turnover Balance").length).toBeGreaterThan(0);
  });

  it("maps legacy mode links forward without breaking", async () => {
    renderPage("/matchup-lens?a=LAR&b=CLE&mode=fingerprint");
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());
    expect(screen.getByTestId("lens-constellation").getAttribute("data-layout")).toBe("side");
    expect(screen.getByTestId("constellation-side")).toBeTruthy();
  });

  it("never shows raw weighting jargon in the normal UI", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-rail")).toBeTruthy());
    const rail = screen.getByTestId("lens-rail");
    await user.click(rail.querySelector("button[data-lens-key]") as HTMLButtonElement);

    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/weighted percentile/i);
    expect(text).not.toMatch(/strong · w2|strong-w0/);
    expect(text).not.toMatch(/probability/i);
  });
});
