// Test fixtures for the `matchup_lens_v1` wire contract.
//
// The evidence values are borrowed from the frozen baseline snapshot purely so
// adapted scores can be compared against the established engine. Nothing here
// is reachable from the production page.

import { LENSES } from "@/lib/matchup-lens";
import { PRESEASON_2026_SNAPSHOT } from "@/lib/matchup-lens-snapshot";
import type {
  MatchupLensV1Response,
  MatchupLensV1TeamEvidence,
} from "@/lib/matchup-lens-api-types";

function teamRow(abv: string) {
  const row = PRESEASON_2026_SNAPSHOT.teams.find((team) => team.teamAbv === abv);
  if (!row) throw new Error(`fixture: unknown team ${abv}`);
  return row;
}

function evidence(abv: string, omitMetrics: string[] = []): MatchupLensV1TeamEvidence {
  const row = teamRow(abv);
  const metrics: MatchupLensV1TeamEvidence["metrics"] = {};
  for (const definition of PRESEASON_2026_SNAPSHOT.metrics) {
    if (omitMetrics.includes(definition.metric)) continue;
    const percentile = row.percentiles[definition.metric];
    metrics[definition.metric] = {
      metric: definition.metric,
      label: definition.label,
      signal_strength: definition.signalStrength,
      lens_tags: definition.lensTags,
      league_percentile: typeof percentile === "number" ? percentile : null,
      value: null,
      league_rank: null,
      teams_ranked: null,
    };
  }
  return {
    team_id: String(row.teamId),
    team_abv: row.teamAbv,
    games_in_window: row.gamesInWindow,
    latest_source_date: row.latestSourceDate,
    data_lag_days: row.dataLagDays,
    metrics,
  };
}

export interface FixtureOptions {
  awayAbv?: string;
  homeAbv?: string;
  gameId?: string;
  /** Metrics omitted from the away team's evidence (asymmetric coverage). */
  awayMissing?: string[];
  /** Extra `context` metrics that must be transported but never scored. */
  contextMetrics?: string[];
  leagueMode?: "suppressed" | "available";
}

export function makeLensV1Payload(options: FixtureOptions = {}): MatchupLensV1Response {
  const awayAbv = options.awayAbv ?? "LAR";
  const homeAbv = options.homeAbv ?? "CLE";
  const awayMissing = options.awayMissing ?? [];
  const contextMetrics = options.contextMetrics ?? [];

  const away = evidence(awayAbv, awayMissing);
  const home = evidence(homeAbv);

  const catalog = PRESEASON_2026_SNAPSHOT.metrics.map((definition) => ({
    metric: definition.metric,
    label: definition.label,
    signal_strength: definition.signalStrength as "strong" | "supporting" | "context",
    lens_tags: definition.lensTags,
  }));

  for (const name of contextMetrics) {
    catalog.push({
      metric: name,
      label: name,
      signal_strength: "context",
      // Deliberately carries a real scoring tag: only the signal strength
      // keeps it out of the lenses.
      lens_tags: ["explosiveness"],
    });
    for (const side of [away, home]) {
      side.metrics[name] = {
        metric: name,
        label: name,
        signal_strength: "context",
        lens_tags: ["explosiveness"],
        league_percentile: 99,
        value: 1,
        league_rank: null,
        teams_ranked: null,
      };
    }
  }

  const readiness = LENSES.map((lens) => {
    const missing = awayMissing.filter((metric) => {
      const definition = PRESEASON_2026_SNAPSHOT.metrics.find((entry) => entry.metric === metric);
      return definition?.lensTags.some((tag) => lens.tags.includes(tag)) ?? false;
    });
    return {
      lens_key: lens.key,
      lens_name: lens.name,
      status: (missing.length > 0 ? "partial" : "complete") as "partial" | "complete",
      away: {
        status: (missing.length > 0 ? "partial" : "complete") as "partial" | "complete",
        metrics_expected: null,
        metrics_present: null,
        missing_metrics: missing,
      },
      home: {
        status: "complete" as const,
        metrics_expected: null,
        metrics_present: null,
        missing_metrics: [],
      },
    };
  });

  return {
    schema_version: "matchup_lens_v1",
    available: true,
    reason: null,
    game: {
      game_id: options.gameId ?? `20260917_${awayAbv}@${homeAbv}`,
      season: "2026",
      season_type: "regular",
      week: "3",
      game_date: "2026-09-17",
      away_team: {
        team_id: String(teamRow(awayAbv).teamId),
        team_abv: awayAbv,
        team_name: null,
      },
      home_team: {
        team_id: String(teamRow(homeAbv).teamId),
        team_abv: homeAbv,
        team_name: null,
      },
    },
    display: {
      window_label: PRESEASON_2026_SNAPSHOT.windowLabel,
      games_label: PRESEASON_2026_SNAPSHOT.gamesLabel,
      context_label: PRESEASON_2026_SNAPSHOT.contextLabel,
    },
    basis: {
      window: "regular_season_to_date",
      as_of_date: PRESEASON_2026_SNAPSHOT.asOfDate,
      source_data_date: "2026-08-22",
      latest_included_game: null,
    },
    metric_catalog: catalog,
    away,
    home,
    coverage: {
      catalog_metric_count: catalog.length,
      away_metric_count: Object.keys(away.metrics).length,
      home_metric_count: Object.keys(home.metrics).length,
      shared_metric_count: Object.keys(away.metrics).length,
      lens_readiness: readiness,
      named_metric_coverage: [],
    },
    warnings: awayMissing.length > 0
      ? [{ code: "asymmetric_evidence", message: "One team is missing evidence.", severity: "info" }]
      : [],
    league_context: {
      mode: options.leagueMode ?? "suppressed",
      reason: "Only the two matchup teams are included.",
      teams_in_payload: 2,
    },
    method: {
      percentile_basis: "league",
      polarity: "corrected",
      notes: null,
    },
  };
}
