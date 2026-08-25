import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LENSES, findTeam, scoreAllLenses } from "@/lib/matchup-lens";
import { PRESEASON_2026_SNAPSHOT as snapshot } from "@/lib/matchup-lens-snapshot";
import { lensScoreTable, lensStanding, metricStanding } from "@/lib/matchup-lens-rank";
import { collisionDirections } from "@/lib/matchup-lens-collision";
import { buildTrace } from "@/lib/matchup-lens-trace";
import { buildGameBrief } from "@/lib/matchup-lens-brief";
import { ordinal, rankText, scoreText, signalRoleLabel } from "@/lib/matchup-lens-language";
import { parseView } from "@/lib/matchup-lens-view";
import { LENS_GLOSSARY } from "@/lib/matchup-lens-glossary";
import { lensGaps } from "@/lib/matchup-lens-compare";
import { buildProfileAngle, TURNOVER_WATCH_EXPLANATION } from "@/lib/matchup-lens-angle";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));

import MatchupLens from "@/pages/MatchupLens";

const lar = findTeam(snapshot, "LAR")!;
const cle = findTeam(snapshot, "CLE")!;

function renderPage(entry = "/matchup-lens") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <MatchupLens />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("language translation", () => {
  it("uses plain signal roles instead of weighting jargon", () => {
    expect(signalRoleLabel("strong")).toBe("Primary signal");
    expect(signalRoleLabel("supporting")).toBe("Supporting signal");
  });

  it("formats ranks and scores for humans", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(22)).toBe("22nd");
    expect(rankText(4, 32)).toBe("4th of 32");
    expect(rankText(null, 32)).toBe("Unranked");
    expect(scoreText(null)).toBe("— / 100");
  });
});

describe("league standing", () => {
  it("ranks every snapshot team on a lens with no gaps or duplicates", () => {
    const table = lensScoreTable(snapshot, LENSES[0].key);
    expect(table).toHaveLength(snapshot.teams.length);
    const scores = table.map((row) => row.score ?? -1);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(new Set(table.map((row) => row.teamAbv)).size).toBe(snapshot.teams.length);
  });

  it("returns a consistent standing for a team and metric", () => {
    const standing = lensStanding(snapshot, LENSES[0].key, "LAR");
    expect(standing?.total).toBe(snapshot.teams.length);
    expect(standing!.rank).toBeGreaterThanOrEqual(1);

    const metricKey = Object.keys(lar.percentiles)[0];
    const metric = metricStanding(snapshot, metricKey, "LAR");
    expect(metric?.rank).toBeGreaterThanOrEqual(1);
  });
});

describe("matchup collision", () => {
  it("builds directional lanes and never invents an unsupported comparison", () => {
    const directions = collisionDirections(snapshot, lar, cle);
    expect(directions).toHaveLength(2);
    for (const direction of directions) {
      expect(direction.lanes.length).toBeGreaterThan(0);
      for (const lane of direction.lanes) {
        if (lane.coverage === "not-supported") {
          expect(lane.edge).toBeNull();
        } else {
          expect(lane.offense.score).not.toBeNull();
          expect(lane.defense.score).not.toBeNull();
        }
      }
    }
  });
});

describe("reverse trace", () => {
  it("walks metric -> tags -> lenses and back", () => {
    const scores = scoreAllLenses(snapshot, lar);
    const contribution = scores[0].contributions[0];
    const metricTrace = buildTrace(
      snapshot,
      { type: "metric", id: contribution.metric },
      LENSES[0].key,
      [lar, cle],
    );
    expect(metricTrace?.type).toBe("metric");
    if (metricTrace?.type !== "metric") throw new Error("expected metric trace");
    expect(metricTrace.tags.length).toBeGreaterThan(0);
    expect(metricTrace.lenses.map((lens) => lens.key)).toContain(LENSES[0].key);
    expect(metricTrace.readings.map((reading) => reading.teamAbv)).toEqual(["LAR", "CLE"]);

    const tag = metricTrace.tags[0];
    const tagTrace = buildTrace(snapshot, { type: "tag", id: tag }, LENSES[0].key, [lar, cle]);
    if (tagTrace?.type !== "tag") throw new Error("expected tag trace");
    expect(tagTrace.metrics.map((metric) => metric.metric)).toContain(contribution.metric);
  });
});

describe("game brief", () => {
  it("summarises separation and battleground without forecasting", () => {
    const brief = buildGameBrief(snapshot, lar, cle, "LAR", "CLE");
    expect(brief.largest).not.toBeNull();
    expect(brief.closest).not.toBeNull();
    expect(brief.observations.length).toBeGreaterThan(0);
  });
});

describe("view parsing", () => {
  it("defaults to overview and maps legacy modes forward", () => {
    expect(parseView("collision", null).view).toBe("collision");
    expect(parseView(null, "brief").view).toBe("overview");
    expect(parseView(null, "fingerprint")).toEqual({ view: "constellation", layout: "side" });
    expect(parseView(null, "map").view).toBe("gaps");
    expect(parseView("nonsense", null).view).toBe("overview");
    expect(parseView(null, null).view).toBe("overview");
  });
});


describe("trace drawer integration", () => {
  it("opens the reverse trace from a lens tag in the evidence panel", async () => {
    const user = userEvent.setup();
    renderPage("/matchup-lens?view=lens&lens=turnover-balance");
    await waitFor(() => expect(screen.getByTestId("lens-evidence")).toBeTruthy());
    const signals = document.querySelector('[data-testid="signals-used"] button') as HTMLButtonElement | null;
    if (signals) await user.click(signals);

    const chip = document.querySelector("button[data-tag]") as HTMLButtonElement;
    expect(chip).toBeTruthy();
    await user.click(chip);

    await waitFor(() => expect(screen.getByTestId("trace-drawer")).toBeTruthy());
    expect(screen.getByTestId("tag-trace")).toBeTruthy();
    // Network and packed views stay behind the secondary technical map.
    expect(screen.getByTestId("technical-map")).toBeTruthy();
    expect(screen.queryByTestId("trace-network")).toBeNull();
    expect(screen.queryByTestId("trace-packed")).toBeNull();
  });
});

describe("lens glossary", () => {
  it("gives every canonical lens one plain-sentence definition", () => {
    for (const lens of LENSES) {
      const entry = LENS_GLOSSARY[lens.key];
      expect(entry).toBeTruthy();
      expect(entry.definition.length).toBeGreaterThan(10);
      expect(entry.definition).not.toMatch(/percentile|weight/i);
    }
  });
});

describe("turnover watch transparency", () => {
  it("derives the profile values from the snapshot and makes no probability claim", () => {
    const gaps = lensGaps(scoreAllLenses(snapshot, lar), scoreAllLenses(snapshot, cle));
    const angle = buildProfileAngle(snapshot, lar, cle, "LAR", "CLE", gaps, []);
    if (!angle || angle.kind !== "turnover-watch") return;
    expect(angle.takeaway).toBeGreaterThanOrEqual(0);
    expect(angle.ballSecurity).toBeGreaterThanOrEqual(0);
    expect(Math.abs(angle.takeaway - angle.ballSecurity)).toBeGreaterThanOrEqual(12);
    expect(TURNOVER_WATCH_EXPLANATION).not.toMatch(/probability|predict|forecast|odds/i);
  });
});
