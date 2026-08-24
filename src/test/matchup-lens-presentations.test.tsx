import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
  comparisonHighlights,
  lensGaps,
  sortBySeparation,
} from "@/lib/matchup-lens-compare";
import { LENSES, findTeam, scoreAllLenses } from "@/lib/matchup-lens";
import { PRESEASON_2026_SNAPSHOT as snapshot } from "@/lib/matchup-lens-snapshot";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));

import MatchupLens from "@/pages/MatchupLens";

const lar = findTeam(snapshot, "LAR")!;
const cle = findTeam(snapshot, "CLE")!;
const gaps = lensGaps(scoreAllLenses(snapshot, lar), scoreAllLenses(snapshot, cle));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/matchup-lens"]}>
        <MatchupLens />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}




describe("comparison arithmetic", () => {
  it("produces one signed gap per canonical lens", () => {
    expect(gaps).toHaveLength(LENSES.length);
    expect(gaps.map((gap) => gap.key)).toEqual(LENSES.map((lens) => lens.key));
    for (const gap of gaps) {
      expect(gap.gap).toBeCloseTo((gap.scoreA ?? 0) - (gap.scoreB ?? 0), 6);
      expect(gap.absGap).toBeCloseTo(Math.abs(gap.gap ?? 0), 6);
      expect(gap.leader).toBe(gap.gap === 0 ? "tie" : (gap.gap ?? 0) > 0 ? "a" : "b");
    }
  });

  it("orders rows by descending absolute separation", () => {
    const sorted = sortBySeparation(gaps).map((gap) => gap.absGap ?? -1);
    expect([...sorted].sort((a, b) => b - a)).toEqual(sorted);
  });

  it("reports the largest and closest lens from the same ordering", () => {
    const { largest, closest } = comparisonHighlights(gaps);
    const sorted = sortBySeparation(gaps);
    expect(largest?.key).toBe(sorted[0].key);
    expect(closest?.key).toBe(sorted[sorted.length - 1].key);
  });
});

describe("Matchup Dashboard presentations", () => {
  it("keeps the selected lens shared between the rail, radar and evidence", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-rail")).toBeTruthy());

    const rail = screen.getByTestId("lens-rail");
    await user.click(
      rail.querySelector('button[data-lens-key="turnover-balance"]') as HTMLButtonElement,
    );

    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(
      "turnover-balance",
    );

    const tiles = Array.from(
      screen.getByTestId("lens-constellation").querySelectorAll("button[data-lens-key]"),
    );
    const pressed = tiles.find((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed?.getAttribute("data-lens-key")).toBe("turnover-balance");
  });

  it("previews only the three widest profile gaps, ordered by separation", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("top-profile-gaps")).toBeTruthy());

    const keys = within(screen.getByTestId("gap-rows"))
      .getAllByRole("button")
      .map((button) => button.getAttribute("data-lens-key"));
    expect(keys).toEqual(sortBySeparation(gaps).slice(0, 3).map((gap) => gap.key));
  });

  it("offers side-by-side as a Constellation layout with identical axes and scale", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());
    expect(screen.getByTestId("constellation-overlay")).toBeTruthy();

    await user.click(
      document.querySelector('button[data-layout-option="side"]') as HTMLButtonElement,
    );

    const side = screen.getByTestId("constellation-side");
    const [a, b] = within(side).getAllByRole("img");
    expect(a.getAttribute("data-axis-order")).toBe(LENSES.map((lens) => lens.key).join(","));
    expect(b.getAttribute("data-axis-order")).toBe(a.getAttribute("data-axis-order"));
    expect(a.getAttribute("data-scale-max")).toBe("100");
    expect(b.getAttribute("data-scale-max")).toBe("100");
  });

  it("hides Momentum entirely while there is no comparable history", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("lens-rail")).toBeTruthy());
    expect(screen.queryByTestId("momentum-shift")).toBeNull();
    expect(screen.queryByText(/Momentum/)).toBeNull();
  });
});

