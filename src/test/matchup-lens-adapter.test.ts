import { describe, expect, it } from "vitest";

import { adaptMatchupLensV1, MatchupLensContractError } from "@/lib/matchup-lens-adapter";
import { LENSES, scoreAllLenses } from "@/lib/matchup-lens";
import type { MatchupLensV1Response } from "@/lib/matchup-lens-api-types";
import { makeLensV1Payload } from "./matchup-lens-v1-fixture";

function clone(payload: MatchupLensV1Response): MatchupLensV1Response {
  return JSON.parse(JSON.stringify(payload)) as MatchupLensV1Response;
}

describe("matchup_lens_v1 adapter", () => {
  it("adapts a valid payload into a two-team snapshot with canonical identities", () => {
    const context = adaptMatchupLensV1(makeLensV1Payload());

    expect(context.snapshot.teams).toHaveLength(2);
    expect(context.game.away.teamAbv).toBe("LAR");
    expect(context.game.home.teamAbv).toBe("CLE");
    expect(context.snapshot.teams[0].teamAbv).toBe("LAR");
    expect(context.snapshot.teams[1].teamAbv).toBe("CLE");
    expect(context.basis.asOfDate).toBe(context.snapshot.asOfDate);
  });

  it("excludes context metrics from definitions and from percentile records", () => {
    const context = adaptMatchupLensV1(
      makeLensV1Payload({ contextMetrics: ["ctx_opponent_total_plays", "ctx_points_allowed"] }),
    );

    const names = context.snapshot.metrics.map((metric) => metric.metric);
    expect(names).not.toContain("ctx_opponent_total_plays");
    expect(names).not.toContain("ctx_points_allowed");
    for (const team of context.snapshot.teams) {
      expect(team.percentiles.ctx_opponent_total_plays).toBeUndefined();
      expect(team.percentiles.ctx_points_allowed).toBeUndefined();
    }
  });

  it("produces identical lens scores whether or not context metrics are transported", () => {
    const withoutContext = adaptMatchupLensV1(makeLensV1Payload());
    const withContext = adaptMatchupLensV1(
      makeLensV1Payload({ contextMetrics: ["ctx_opponent_total_plays"] }),
    );

    const score = (context: ReturnType<typeof adaptMatchupLensV1>) =>
      scoreAllLenses(context.snapshot, context.snapshot.teams[0]).map((row) => row.score);

    expect(score(withContext)).toEqual(score(withoutContext));
  });

  it("omits null percentiles and keeps zero", () => {
    const payload = makeLensV1Payload();
    const [firstKey, secondKey] = Object.keys(payload.away!.metrics);
    payload.away!.metrics[firstKey].league_percentile = null;
    payload.away!.metrics[secondKey].league_percentile = 0;

    const context = adaptMatchupLensV1(payload);
    expect(context.snapshot.teams[0].percentiles[firstKey]).toBeUndefined();
    expect(context.snapshot.teams[0].percentiles[secondKey]).toBe(0);
  });

  it("keeps dynamic metrics that are not in any hardcoded list", () => {
    const payload = makeLensV1Payload();
    payload.metric_catalog!.push({
      metric: "brand_new_metric",
      label: "Brand new metric",
      signal_strength: "strong",
      lens_tags: ["explosiveness"],
    });
    for (const side of [payload.away!, payload.home!]) {
      side.metrics.brand_new_metric = {
        metric: "brand_new_metric",
        label: "Brand new metric",
        signal_strength: "strong",
        lens_tags: ["explosiveness"],
        league_percentile: 70,
        value: null,
        league_rank: null,
        teams_ranked: null,
      };
    }

    const context = adaptMatchupLensV1(payload);
    expect(context.snapshot.metrics.some((m) => m.metric === "brand_new_metric")).toBe(true);
    expect(context.snapshot.teams[0].percentiles.brand_new_metric).toBe(70);
  });

  it("carries exactly six readiness rows in the frozen lens order", () => {
    const context = adaptMatchupLensV1(makeLensV1Payload());
    expect(context.coverage.lensReadiness.map((row) => row.lensKey)).toEqual(
      LENSES.map((lens) => lens.key),
    );
  });

  it("reports suppressed league context", () => {
    expect(adaptMatchupLensV1(makeLensV1Payload()).leagueContext.suppressed).toBe(true);
    expect(
      adaptMatchupLensV1(makeLensV1Payload({ leagueMode: "available" })).leagueContext.suppressed,
    ).toBe(false);
  });

  it("surfaces asymmetric readiness without altering the other side", () => {
    const missing = "yards_per_play";
    const payload = makeLensV1Payload({ awayMissing: [missing] });
    const context = adaptMatchupLensV1(payload);

    expect(context.snapshot.teams[0].percentiles[missing]).toBeUndefined();
    expect(context.snapshot.teams[1].percentiles[missing]).toBeDefined();
    const partial = context.coverage.lensReadiness.filter((row) => row.status === "partial");
    expect(partial.length).toBeGreaterThan(0);
    expect(partial[0].away?.status).toBe("partial");
    expect(partial[0].home?.status).toBe("complete");
  });

  it("never fills a missing input with zero", () => {
    const payload = makeLensV1Payload();
    const key = Object.keys(payload.away!.metrics)[0];
    payload.away!.metrics[key].league_percentile = null;
    const context = adaptMatchupLensV1(payload);
    expect(Object.values(context.snapshot.teams[0].percentiles)).not.toContain(undefined);
    expect(key in context.snapshot.teams[0].percentiles).toBe(false);
  });

  it("passes backend warnings through as plain messages", () => {
    const context = adaptMatchupLensV1(makeLensV1Payload({ awayMissing: ["yards_per_play"] }));
    expect(context.coverage.warnings).toEqual(["One team is missing evidence."]);
  });

  it("accepts the production method block, which has no percentile_basis", () => {
    const payload = clone(makeLensV1Payload());
    payload.method = {
      selection:
        "Latest phase-appropriate ranking snapshot strictly before the scheduled game date.",
      frontend_role:
        "Existing Matchup Lens formulas transform this evidence into lens scores and comparison language.",
      forecast: false,
    };
    expect("percentile_basis" in (payload.method as object)).toBe(false);

    const context = adaptMatchupLensV1(payload);
    expect(context.method.forecast).toBe(false);
    expect(context.snapshot.teams).toHaveLength(2);
    expect(scoreAllLenses(context.snapshot, context.snapshot.teams[0]).some((r) => r.score !== null))
      .toBe(true);
  });

  const rejections: Array<[string, (payload: MatchupLensV1Response) => void]> = [
    ["a wrong schema version", (p) => ((p as { schema_version: string }).schema_version = "v2")],
    ["an unavailable envelope", (p) => (p.available = false)],
    ["a missing game header", (p) => (p.game = null)],
    ["a missing display block", (p) => (p.display = null)],
    ["a missing basis block", (p) => (p.basis = null)],
    ["a missing coverage block", (p) => (p.coverage = null)],
    ["a missing league context", (p) => (p.league_context = null)],
    ["a missing method block", (p) => (p.method = null)],
    ["a non-canonical team id", (p) => (p.game!.away_team.team_id = "eleven")],
    [
      "evidence that disagrees with the canonical header",
      (p) => (p.away!.team_abv = "XXX"),
    ],
    [
      "a metric key that disagrees with its nested name",
      (p) => {
        const key = Object.keys(p.away!.metrics)[0];
        p.away!.metrics[key].metric = "something_else";
      },
    ],
    [
      "a signal strength that disagrees with the catalog",
      (p) => {
        const key = Object.keys(p.away!.metrics)[0];
        p.away!.metrics[key].signal_strength = "context";
      },
    ],
    ["an unknown signal strength", (p) => (p.metric_catalog![0].signal_strength = "weak" as never)],
    [
      "a percentile outside 0-100",
      (p) => {
        const key = Object.keys(p.away!.metrics)[0];
        p.away!.metrics[key].league_percentile = 140;
      },
    ],
    ["fewer than six readiness rows", (p) => p.coverage!.lens_readiness.pop()],
    [
      "readiness rows out of the frozen order",
      (p) => {
        const rows = p.coverage!.lens_readiness;
        [rows[0], rows[1]] = [rows[1], rows[0]];
      },
    ],
    ["an unknown league-context mode", (p) => (p.league_context!.mode = "partial" as never)],
    ["an incorrect method.selection", (p) => (p.method!.selection = "Something else" as never)],
    ["an incorrect method.frontend_role", (p) => (p.method!.frontend_role = "Other" as never)],
    ["a forecasting method block", (p) => (p.method!.forecast = true as never)],
  ];

  for (const [label, mutate] of rejections) {
    it(`rejects ${label} without partially scoring`, () => {
      const payload = clone(makeLensV1Payload());
      mutate(payload);
      expect(() => adaptMatchupLensV1(payload)).toThrow(MatchupLensContractError);
    });
  }
});
