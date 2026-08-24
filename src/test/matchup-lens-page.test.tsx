import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("MatchupLens page", () => {
  it("renders default LAR vs CLE with the context label and no Event Pulse", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("experience-launcher")).toBeTruthy());
    expect(screen.getByTestId("lens-context-label").textContent).toBe(
      "Preseason-to-date · Aug 23, 2026 · 2–3 games · comparison, not forecast.",
    );
    expect(screen.getByText(/Los Angeles Rams/)).toBeTruthy();
    expect(screen.getByText(/Cleveland Browns/)).toBeTruthy();
    expect(screen.getAllByText("Explosiveness").length).toBeGreaterThan(0);
    expect(screen.queryByText("Event Pulse")).toBeNull();
    expect(screen.queryByTestId("event-pulse")).toBeNull();
  });

  it("honours a deep link with teams, mode and lens", async () => {
    renderPage("/matchup-lens?a=KC&b=WAS&mode=brief&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("game-brief")).toBeTruthy());
    expect(screen.getByText(/Kansas City Chiefs/)).toBeTruthy();
    expect(screen.getByText(/Washington Commanders/)).toBeTruthy();
    expect(screen.getAllByText("Turnover Balance").length).toBeGreaterThan(0);
  });
});
