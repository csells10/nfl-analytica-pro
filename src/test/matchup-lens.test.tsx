import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
  EVENT_PULSE_METRICS,
  LENSES,
  eventPulseForTeam,
  findTeam,
  metricWeight,
  metricsForLens,
  scoreLens,
} from "@/lib/matchup-lens";
import { PRESEASON_2026_SNAPSHOT } from "@/lib/matchup-lens-snapshot";
import { LensConstellation } from "@/components/matchup-lens/LensConstellation";
import { EventPulse } from "@/components/matchup-lens/EventPulse";
import type { MetricDefinition } from "@/lib/matchup-lens-types";

const snapshot = PRESEASON_2026_SNAPSHOT;

function metric(overrides: Partial<MetricDefinition>): MetricDefinition {
  return {
    metric: "m",
    label: "M",
    signalStrength: "supporting",
    lensTags: [],
    ...overrides,
  };
}

describe("snapshot integrity", () => {
  it("carries all 32 teams for the verified as-of date", () => {
    expect(snapshot.teams).toHaveLength(32);
    expect(snapshot.asOfDate).toBe("2026-08-23");
    expect(snapshot.contextLabel).toBe(
      "Preseason-to-date · Aug 23, 2026 · 2–3 games · comparison, not forecast.",
    );
  });

  it("totals 1,452 team-metric rows", () => {
    const total = snapshot.teams.reduce(
      (sum, team) => sum + Object.keys(team.percentiles).length,
      0,
    );
    expect(total).toBe(1452);
  });
});

describe("metric weighting", () => {
  it("weights strong signals 2 and others 1", () => {
    expect(metricWeight(metric({ signalStrength: "strong" }))).toBe(2);
    expect(metricWeight(metric({ signalStrength: "supporting" }))).toBe(1);
  });

  it("halves volume-sensitive metrics and applies 0.75 to volatility", () => {
    expect(metricWeight(metric({ lensTags: ["volume-sensitive"] }))).toBe(0.5);
    expect(metricWeight(metric({ lensTags: ["volatility"] }))).toBe(0.75);
    expect(
      metricWeight(metric({ signalStrength: "strong", lensTags: ["volume-sensitive", "volatility"] })),
    ).toBe(0.75);
  });
});

describe("lens membership", () => {
  it("excludes every rare-event metric from all six lenses", () => {
    for (const lens of LENSES) {
      const members = metricsForLens(lens, snapshot.metrics);
      expect(members.length).toBeGreaterThan(0);
      expect(members.some((m) => m.lensTags.includes("rare-event"))).toBe(false);
    }
  });

  it("excludes defensive-scoring and swing-play from Defensive Resistance", () => {
    const lens = LENSES.find((l) => l.key === "defensive-resistance")!;
    const members = metricsForLens(lens, snapshot.metrics);
    expect(
      members.some((m) => m.lensTags.includes("defensive-scoring") || m.lensTags.includes("swing-play")),
    ).toBe(false);
  });

  it("excludes blocked-kicks and special-teams from Disruption & Protection", () => {
    const lens = LENSES.find((l) => l.key === "disruption-protection")!;
    const members = metricsForLens(lens, snapshot.metrics);
    expect(
      members.some((m) => m.lensTags.includes("blocked-kicks") || m.lensTags.includes("special-teams")),
    ).toBe(false);
  });

  it("de-duplicates metrics within a lens", () => {
    const lens = LENSES.find((l) => l.key === "scoring-finish")!;
    const members = metricsForLens(lens, snapshot.metrics);
    expect(new Set(members.map((m) => m.metric)).size).toBe(members.length);
  });
});

describe("lens scoring", () => {
  it("returns the weighted average of league percentiles", () => {
    const lens = LENSES[0];
    const team = findTeam(snapshot, "LAR")!;
    const result = scoreLens(lens, snapshot, team);
    const expected =
      result.contributions.reduce((sum, c) => sum + c.percentile * c.weight, 0) /
      result.contributions.reduce((sum, c) => sum + c.weight, 0);
    expect(result.score).toBeCloseTo(expected, 10);
    expect(result.score! >= 0 && result.score! <= 100).toBe(true);
  });

  it("scores both default teams on all six lenses", () => {
    for (const abv of ["LAR", "CLE"]) {
      const team = findTeam(snapshot, abv)!;
      for (const lens of LENSES) {
        expect(scoreLens(lens, snapshot, team).score).not.toBeNull();
      }
    }
  });
});

describe("event pulse", () => {
  it("reports the seven rare-event metrics with honest tie counts", () => {
    const team = findTeam(snapshot, "LAR")!;
    const entries = eventPulseForTeam(snapshot, team);
    expect(entries.map((e) => e.metric)).toEqual([...EVENT_PULSE_METRICS]);
    const tied = entries.filter((e) => e.tiedWith > 1);
    expect(tied.length).toBeGreaterThan(0);
    for (const entry of entries) {
      if (entry.rank !== null) expect(entry.rank).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("rendering", () => {
  it("renders all six axes with both team scores", () => {
    const client = new QueryClient();
    const axes = LENSES.map((lens, i) => ({
      key: lens.key,
      name: lens.name,
      scoreA: 50 + i,
      scoreB: 40 + i,
    }));
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LensConstellation
            axes={axes}
            labelA="LAR"
            labelB="CLE"
            selectedKey="explosiveness"
            onSelect={() => undefined}
            onHover={() => undefined}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    for (const lens of LENSES) {
      expect(screen.getAllByText(lens.name).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("50.0")).toBeTruthy();
  });

  it("renders Event Pulse tie language", () => {
    const team = findTeam(snapshot, "LAR")!;
    const other = findTeam(snapshot, "CLE")!;
    render(
      <EventPulse
        entriesA={eventPulseForTeam(snapshot, team)}
        entriesB={eventPulseForTeam(snapshot, other)}
        labelA="LAR"
        labelB="CLE"
      />,
    );
    expect(screen.getByText("Event Pulse")).toBeTruthy();
    expect(screen.getAllByText(/tied,/).length).toBeGreaterThan(0);
  });
});
