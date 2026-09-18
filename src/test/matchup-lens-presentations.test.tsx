import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("@/lib/firebase", () => ({ getAuthToken: async () => "test-token", firebaseAuth: {} }));

import MatchupLens from "@/pages/MatchupLens";
import { installLensFetchMock, withGame, type LensFetchMock } from "./matchup-lens-live-harness";

const lar = findTeam(snapshot, "LAR")!;
const cle = findTeam(snapshot, "CLE")!;
const gaps = lensGaps(scoreAllLenses(snapshot, lar), scoreAllLenses(snapshot, cle));

let fetchMock: LensFetchMock | null = null;
beforeEach(() => {
  fetchMock = installLensFetchMock();
});
afterEach(() => {
  fetchMock?.restore();
  fetchMock = null;
});

function renderPage(entry = "/matchup-lens") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[withGame(entry)]}>
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

describe("Matchup Dashboard focused views", () => {
  it("keeps the selected lens shared between the explorer, radar and evidence", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=lenses");
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());

    await user.click(
      screen
        .getByTestId("lens-explorer")
        .querySelector('button[data-lens-key="turnover-balance"]') as HTMLButtonElement,
    );

    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    expect(screen.getByTestId("lens-evidence").getAttribute("data-lens-key")).toBe(
      "turnover-balance",
    );

    // The focused lens keeps stepping controls, while the single Back action returns to Overview.
    expect(screen.getByTestId("journey-lens-select")).toBeTruthy();
    await user.click(screen.getByTestId("context-back"));
    await waitFor(() => expect(screen.getByTestId("destination-cards")).toBeTruthy());
    await user.click(screen.getByTestId("destination-open-constellation"));
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());

    const tiles = Array.from(
      screen.getByTestId("lens-constellation").querySelectorAll("button[data-lens-key]"),
    );
    const pressed = tiles.find((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed?.getAttribute("data-lens-key")).toBe("turnover-balance");
  });

  it("lists the profile gaps ordered by separation in the focused gaps view", async () => {
    renderPage("/matchup-lens?view=gaps");
    await waitFor(() => expect(screen.getByTestId("top-profile-gaps")).toBeTruthy());

    const keys = within(screen.getByTestId("gap-rows"))
      .getAllByRole("button")
      .map((button) => button.getAttribute("data-lens-key"));
    expect(keys).toEqual(sortBySeparation(gaps).map((gap) => gap.key));
  });

  it("offers side-by-side as a Constellation layout with identical axes and scale", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=constellation");
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
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());
    expect(screen.queryByTestId("momentum-shift")).toBeNull();
    expect(screen.queryByText(/Momentum/)).toBeNull();
  });

});

describe("interaction polish", () => {
  const axisLabel = (name: string) => name.split(" ").join("");

  it("activates the same chart axis from keyboard focus and pointer hover on a score tile", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=constellation");
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());

    const target = LENSES[2];
    const tile = document.querySelector(
      `button[data-lens-key="${target.key}"]`,
    ) as HTMLButtonElement;

    tile.focus();
    await waitFor(() => expect(tile.getAttribute("data-axis-active")).toBe("true"));
    const overlay = screen.getByTestId("constellation-overlay");
    const label = Array.from(overlay.querySelectorAll("text")).find(
      (node) => node.textContent === axisLabel(target.name),
    );
    expect(label?.getAttribute("class")).toContain("fill-foreground");

    tile.blur();
    await waitFor(() => expect(tile.getAttribute("data-axis-active")).toBeNull());

    await user.hover(tile);
    await waitFor(() => expect(tile.getAttribute("data-axis-active")).toBe("true"));
  });

  it("keeps chart hit areas out of the keyboard tab order in both layouts", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=constellation");
    await waitFor(() => expect(screen.getByTestId("lens-constellation")).toBeTruthy());

    const hits = () => Array.from(document.querySelectorAll("[data-axis-hit]"));
    expect(hits().length).toBeGreaterThan(0);
    for (const hit of hits()) expect(hit.getAttribute("tabindex")).toBe("-1");

    await user.click(
      document.querySelector('button[data-layout-option="side"]') as HTMLButtonElement,
    );
    expect(hits().length).toBeGreaterThan(0);
    for (const hit of hits()) expect(hit.getAttribute("tabindex")).toBe("-1");
  });

  it("shows evidence arrows only when the rail actually overflows", async () => {
    renderPage(`/matchup-lens?view=lens&lens=${LENSES[0].key}`);
    await waitFor(() => expect(screen.getByTestId("evidence-rail")).toBeTruthy());

    // jsdom reports no measurable overflow, so no arrows are offered.
    expect(screen.queryByTestId("evidence-rail-arrows")).toBeNull();

    const scroller = screen.getByTestId("evidence-rail-scroller");
    Object.defineProperty(scroller, "clientWidth", { value: 300, configurable: true });
    Object.defineProperty(scroller, "scrollWidth", { value: 900, configurable: true });
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(screen.getByTestId("evidence-rail-arrows")).toBeTruthy());
    const left = screen.getByLabelText("Scroll evidence left") as HTMLButtonElement;
    const right = screen.getByLabelText("Scroll evidence right") as HTMLButtonElement;
    expect(left.disabled).toBe(true);
    expect(right.disabled).toBe(false);

    Object.defineProperty(scroller, "scrollLeft", { value: 600, configurable: true });
    scroller.dispatchEvent(new Event("scroll"));
    await waitFor(() =>
      expect((screen.getByLabelText("Scroll evidence right") as HTMLButtonElement).disabled).toBe(
        true,
      ),
    );
    expect((screen.getByLabelText("Scroll evidence left") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("labels the evidence toggle with the number of hidden rows", async () => {
    const user = userEvent.setup();
    renderPage(`/matchup-lens?view=lens&lens=${LENSES[0].key}`);
    const toggle = await screen.findByTestId("toggle-all-evidence");

    expect(toggle.textContent).toMatch(/^Show \d+ more$/);
    await user.click(toggle);
    expect(screen.getByTestId("toggle-all-evidence").textContent).toBe("Show key evidence only");
  });

  it("marks the selected All Six Lenses tile as active rather than muted", async () => {
    const user = userEvent.setup();
    renderPage(`/matchup-lens?view=lenses&lens=${LENSES[1].key}`);
    await waitFor(() => expect(document.querySelector("button[data-lens-key]")).toBeTruthy());

    const tile = document.querySelector(
      `button[data-lens-key="${LENSES[1].key}"]`,
    ) as HTMLButtonElement;
    await user.click(tile);

    const selected = document.querySelector(
      `button[data-lens-key="${LENSES[1].key}"]`,
    ) as HTMLButtonElement;
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.className).toContain("border-primary");
    expect(selected.className).toContain("bg-primary/10");
  });
});
