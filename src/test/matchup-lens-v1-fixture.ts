// Test fixtures for the `matchup_lens_v1` wire contract.
//
// The envelope shape mirrors the authenticated production response exactly
// (string metric catalog, evidence under `teams.away` / `teams.home`, metadata
// on team metric entries, warnings under `coverage`). Evidence values are
// borrowed from the frozen baseline snapshot purely so adapted scores can be
// compared against the established engine. Nothing here is reachable from the
// production page.

import { LENSES } from "@/lib/matchup-lens";
import { PRESEASON_2026_SNAPSHOT } from "@/lib/matchup-lens-snapshot";
import {
  MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE,
  MATCHUP_LENS_V1_METHOD_SELECTION,
  type MatchupLensV1Response,
  type MatchupLensV1TeamEvidence,
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
    latest_included_game_id: `20260910_${row.teamAbv}@XXX`,
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
  /** Extra `supporting` metrics, for exact catalog-count scenarios. */
  extraScoringMetrics?: string[];
  leagueMode?: "suppressed" | "available";
}

export function makeLensV1Payload(options: FixtureOptions = {}): MatchupLensV1Response {
  const awayAbv = options.awayAbv ?? "LAR";
  const homeAbv = options.homeAbv ?? "CLE";
  const awayMissing = options.awayMissing ?? [];
  const contextMetrics = options.contextMetrics ?? [];
  const extraScoringMetrics = options.extraScoringMetrics ?? [];

  const away = evidence(awayAbv, awayMissing);
  const home = evidence(homeAbv);

  const catalog = PRESEASON_2026_SNAPSHOT.metrics.map((definition) => definition.metric);

  for (const name of extraScoringMetrics) {
    catalog.push(name);
    for (const side of [away, home]) {
      side.metrics[name] = {
        metric: name,
        label: name,
        signal_strength: "supporting",
        lens_tags: ["explosiveness"],
        league_percentile: 50,
        value: null,
        league_rank: null,
        teams_ranked: null,
      };
    }
  }

  for (const name of contextMetrics) {
    catalog.push(name);
    for (const side of [away, home]) {
      side.metrics[name] = {
        metric: name,
        label: name,
        signal_strength: "context",
        // Deliberately carries a real scoring tag: only the signal strength
        // keeps it out of the lenses.
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
    const awayStatus = (missing.length > 0 ? "partial" : "complete") as "partial" | "complete";
    return {
      lens_key: lens.key,
      display_name: lens.name,
      comparison_status: awayStatus,
      away: {
        status: awayStatus,
        catalog_eligible_metric_count: null,
        eligible_numeric_metric_count: null,
        missing_metrics: missing,
      },
      home: {
        status: "complete" as const,
        catalog_eligible_metric_count: null,
        eligible_numeric_metric_count: null,
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
      game_date: "2026-09-17",
      game_time: null,
      game_status: null,
      season: "2026",
      game_week: "3",
      season_type: "regular",
      away_team: {
        team_id: String(teamRow(awayAbv).teamId),
        team_abv: awayAbv,
        logo_url: null,
      },
      home_team: {
        team_id: String(teamRow(homeAbv).teamId),
        team_abv: homeAbv,
        logo_url: null,
      },
    },
    display: {
      window_label: PRESEASON_2026_SNAPSHOT.windowLabel,
      games_label: PRESEASON_2026_SNAPSHOT.gamesLabel,
      context_label: PRESEASON_2026_SNAPSHOT.contextLabel,
    },
    basis: {
      window_type: "regular_season_to_date",
      as_of_date: PRESEASON_2026_SNAPSHOT.asOfDate,
      source_data_dates: ["2026-08-22"],
      max_data_lag_days: 1,
      pregame_safe: true,
      comparison_not_forecast: true,
      rankings_source: "rankings",
      window_source: "season_to_date",
    },
    metric_catalog: catalog,
    teams: { away, home },
    coverage: {
      catalog_metric_count: catalog.length,
      away_metric_count: Object.keys(away.metrics).length,
      home_metric_count: Object.keys(home.metrics).length,
      shared_metric_count: Object.keys(away.metrics).length,
      missing_away_metrics: awayMissing,
      missing_home_metrics: [],
      lens_readiness: readiness,
      warnings:
        awayMissing.length > 0
          ? [
              {
                code: "ASYMMETRIC_LENS_EVIDENCE",
                message: "One team is missing evidence.",
                lens_key: null,
                team_side: "away",
                metrics: awayMissing,
              },
            ]
          : [],
    },
    league_context: {
      mode: options.leagueMode ?? "suppressed",
      reason_code: "TWO_TEAM_PAYLOAD",
      message: "Only the two matchup teams are included.",
    },
    method: {
      selection: MATCHUP_LENS_V1_METHOD_SELECTION,
      frontend_role: MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE,
      forecast: false,
    },
  };
}
