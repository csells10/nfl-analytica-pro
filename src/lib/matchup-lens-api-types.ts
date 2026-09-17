// Transport types for the frozen `matchup_lens_v1` backend contract.
//
// These types describe the wire format only, exactly as production serves it.
// They are deliberately separate from the frontend scoring types in
// `matchup-lens-types.ts`: nothing here reaches the scoring engine without
// passing through the adapter in `matchup-lens-adapter.ts`.
//
// Nullability mirrors the contract. Keys the contract declares as always
// present are required here even when their value may be null — an optional
// key would hide a contract violation instead of surfacing it.

export const MATCHUP_LENS_SCHEMA_VERSION = "matchup_lens_v1";

/**
 * Signal strengths the API may transport. Wider than the frontend scoring
 * union on purpose: `context` metrics are valid evidence on the wire but are
 * never adapted into a scoring definition.
 */
export type MatchupLensV1SignalStrength = "strong" | "supporting" | "context";

export type MatchupLensV1ReadinessStatus = "complete" | "partial" | "unavailable";

export type MatchupLensV1LeagueContextMode = "suppressed" | "available";

/** Canonical game header. Team identity comes from here, never from the ID. */
export interface MatchupLensV1Team {
  /** Canonical decimal string, e.g. "11". */
  team_id: string;
  team_abv: string;
  logo_url: string | null;
}

export interface MatchupLensV1Game {
  game_id: string;
  game_date: string | null;
  game_time: string | null;
  game_status: string | null;
  season: string | null;
  game_week: string | null;
  season_type: string | null;
  away_team: MatchupLensV1Team;
  home_team: MatchupLensV1Team;
}

/** Backend-owned display strings. The frontend never composes these itself. */
export interface MatchupLensV1Display {
  window_label: string;
  games_label: string;
  context_label: string;
}

/** Evidence basis and freshness. */
export interface MatchupLensV1Basis {
  window_type: string;
  as_of_date: string;
  source_data_dates: string[];
  max_data_lag_days: number;
  pregame_safe: boolean;
  comparison_not_forecast: boolean;
  rankings_source: string | null;
  window_source: string | null;
}

/**
 * One team's reading of one metric. `league_percentile` is already
 * polarity-corrected on a 0-100 scale; `value` is raw source evidence and is
 * never mapped into lens scoring. Additional descriptive fields ride along and
 * are ignored by the adapter.
 */
export interface MatchupLensV1TeamMetric {
  metric: string;
  label: string;
  signal_strength: MatchupLensV1SignalStrength;
  lens_tags: string[];
  league_percentile: number | null;
  value?: number | null;
  league_rank?: number | null;
  teams_ranked?: number | null;
}

export interface MatchupLensV1TeamEvidence {
  team_id: string;
  team_abv: string;
  games_in_window: number;
  latest_included_game_id: string | null;
  latest_source_date: string;
  data_lag_days: number;
  /** Keyed by metric name; each record's key must equal its nested `.metric`. */
  metrics: Record<string, MatchupLensV1TeamMetric>;
}

/** Both sides of the matchup. Evidence is never at the envelope root. */
export interface MatchupLensV1Teams {
  away: MatchupLensV1TeamEvidence;
  home: MatchupLensV1TeamEvidence;
}

export interface MatchupLensV1SideReadiness {
  status: MatchupLensV1ReadinessStatus;
  catalog_eligible_metric_count: number | null;
  eligible_numeric_metric_count: number | null;
  missing_metrics: string[] | null;
}

/** Six rows, in the frozen lens order. Disclosure metadata, never a score. */
export interface MatchupLensV1LensReadiness {
  lens_key: string;
  display_name: string | null;
  comparison_status: MatchupLensV1ReadinessStatus;
  away: MatchupLensV1SideReadiness | null;
  home: MatchupLensV1SideReadiness | null;
}

export interface MatchupLensV1Warning {
  code: string;
  /** Safe, user-presentable text. Never an exception or internal detail. */
  message: string;
  lens_key?: string | null;
  team_side?: string | null;
  metrics?: string[] | null;
}

export interface MatchupLensV1Coverage {
  catalog_metric_count: number;
  away_metric_count: number;
  home_metric_count: number;
  shared_metric_count: number;
  missing_away_metrics: string[] | null;
  missing_home_metrics: string[] | null;
  lens_readiness: MatchupLensV1LensReadiness[];
  warnings: MatchupLensV1Warning[] | null;
}

export interface MatchupLensV1LeagueContext {
  mode: MatchupLensV1LeagueContextMode;
  reason_code: string | null;
  message: string | null;
}

export const MATCHUP_LENS_V1_METHOD_SELECTION =
  "Latest phase-appropriate ranking snapshot strictly before the scheduled game date." as const;

export const MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE =
  "Existing Matchup Lens formulas transform this evidence into lens scores and comparison language." as const;

/** Frozen literals. The contract admits no other values. */
export interface MatchupLensV1Method {
  selection: typeof MATCHUP_LENS_V1_METHOD_SELECTION;
  frontend_role: typeof MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE;
  forecast: false;
}

/**
 * Complete v1 envelope. Every key is present on every response; unavailable
 * responses carry `available: false`, a safe `reason`, and null evidence.
 */
export interface MatchupLensV1Response {
  schema_version: string;
  available: boolean;
  reason: string | null;
  game: MatchupLensV1Game | null;
  display: MatchupLensV1Display | null;
  basis: MatchupLensV1Basis | null;
  /** Ordered list of unique metric names. Metadata lives on team metrics. */
  metric_catalog: string[] | null;
  teams: MatchupLensV1Teams | null;
  coverage: MatchupLensV1Coverage | null;
  league_context: MatchupLensV1LeagueContext | null;
  method: MatchupLensV1Method | null;
}
