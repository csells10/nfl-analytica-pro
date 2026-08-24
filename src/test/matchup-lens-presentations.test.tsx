import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
  comparisonHighlights,
  eventPulsePairs,
  lensGaps,
  sortBySeparation,
} from "@/lib/matchup-lens-compare";
import { LENSES, eventPulseForTeam, findTeam, scoreAllLenses } from "@/lib/matchup-lens";
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
      <MemoryRouter>
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

describe("event pulse pairing", () => {
  it("flags only rare events where the two teams sit at different percentiles", () => {
    const pairs = eventPulsePairs(eventPulseForTeam(snapshot, lar), eventPulseForTeam(snapshot, cle));
    expect(pairs).toHaveLength(7);
    for (const pair of pairs) {
      expect(pair.differs).toBe(pair.a.percentile !== pair.b.percentile);
    }
  });
});

describe("MatchupLens presentations", () => {
  it("keeps teams and selected lens shared across mode switches", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Event Pulse")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Turnover Balance/ }));
    await user.click(screen.getByRole("radio", { name: "Advantage Map" }));

    const rows = screen.getByTestId("advantage-rows");
    const selected = within(rows)
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-pressed") === "true");
    expect(selected?.getAttribute("data-lens-key")).toBe("turnover-balance");

    await user.click(screen.getByRole("radio", { name: "Team Fingerprint" }));
    expect(screen.getByText(/Los Angeles Rams/)).toBeTruthy();
    expect(screen.getByText(/Cleveland Browns/)).toBeTruthy();
    expect(screen.getAllByText("Turnover Balance").length).toBeGreaterThan(0);
  });

  it("renders the advantage map ordered by gap and supports the canonical toggle", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Event Pulse")).toBeTruthy());
    await user.click(screen.getByRole("radio", { name: "Advantage Map" }));

    const keys = () =>
      within(screen.getByTestId("advantage-rows"))
        .getAllByRole("button")
        .map((button) => button.getAttribute("data-lens-key"));

    expect(keys()).toEqual(sortBySeparation(gaps).map((gap) => gap.key));
    await user.click(screen.getByRole("button", { name: /sorted by gap/i }));
    expect(keys()).toEqual(LENSES.map((lens) => lens.key));
  });

  it("renders two fingerprints with identical axis order and fixed scale", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Event Pulse")).toBeTruthy());
    await user.click(screen.getByRole("radio", { name: "Team Fingerprint" }));

    const a = screen.getByTestId("fingerprint-radar-a");
    const b = screen.getByTestId("fingerprint-radar-b");
    expect(a.getAttribute("data-axis-order")).toBe(LENSES.map((lens) => lens.key).join(","));
    expect(b.getAttribute("data-axis-order")).toBe(a.getAttribute("data-axis-order"));
    expect(a.getAttribute("data-scale-max")).toBe("100");
    expect(b.getAttribute("data-scale-max")).toBe("100");
  });

  it("keeps Event Pulse independent of lens selection and collapses ties by default", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Event Pulse")).toBeTruthy());

    const pulse = screen.getByTestId("event-pulse");
    expect(
      within(pulse).getByText(/does not change when you select a lens/i),
    ).toBeTruthy();
    const before = within(pulse).getByTestId("event-pulse-summary").textContent;

    await user.click(screen.getByRole("button", { name: /Explosiveness/ }));
    expect(within(pulse).getByTestId("event-pulse-summary").textContent).toBe(before);

    const disclosure = within(pulse).getByRole("button", { name: /show all 7 rare events/i });
    const collapsedRows = within(pulse).queryByTestId("event-pulse-rows");
    const collapsedCount = collapsedRows ? within(collapsedRows).getAllByRole("row").length : 0;
    await user.click(disclosure);
    expect(within(within(pulse).getByTestId("event-pulse-rows")).getAllByRole("row")).toHaveLength(7);
    expect(collapsedCount).toBeLessThanOrEqual(7);
  });
});
