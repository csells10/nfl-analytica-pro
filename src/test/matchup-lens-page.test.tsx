import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));

import MatchupLens from "@/pages/MatchupLens";

describe("MatchupLens page", () => {
  it("renders default LAR vs CLE with context label and Event Pulse", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><MatchupLens /></MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("Event Pulse")).toBeTruthy());
    expect(screen.getByTestId("lens-context-label").textContent).toBe(
      "Preseason-to-date · Aug 23, 2026 · 2–3 games · comparison, not forecast.",
    );
    expect(screen.getByText(/Los Angeles Rams/)).toBeTruthy();
    expect(screen.getByText(/Cleveland Browns/)).toBeTruthy();
    expect(screen.getAllByText("Explosiveness").length).toBeGreaterThan(0);
  });
});
