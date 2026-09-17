// Pure adapter: `matchup_lens_v1` wire payload -> frontend `LensSnapshot`.
//
// Synchronous and side-effect free. It validates every invariant that safe
// adaptation depends on and throws `MatchupLensContractError` on any violation
// — a contract-invalid response never produces a partially scored snapshot.
//
// Scoring policy stays in `matchup-lens.ts`. This module only translates
// evidence; readiness, warnings, canonical header and league context ride
// alongside the snapshot as non-scoring metadata.

import { LENSES } from "./matchup-lens";
import {
  MATCHUP_LENS_SCHEMA_VERSION,
  MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE,
  MATCHUP_LENS_V1_METHOD_SELECTION,
  type MatchupLensV1Coverage,
  type MatchupLensV1LensReadiness,
  type MatchupLensV1Response,
  type MatchupLensV1SignalStrength,
  type MatchupLensV1TeamEvidence,
  type MatchupLensV1Warning,
} from "./matchup-lens-api-types";
import type {
  LensSnapshot,
  MetricDefinition,
  SignalStrength,
  TeamMetricRow,
} from "./matchup-lens-types";

/** Thrown for any response that cannot be safely adapted. */
export class MatchupLensContractError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Matchup Lens contract violation: ${detail}`);
    this.name = "MatchupLensContractError";
    this.detail = detail;
  }
}

export interface MatchupLensTeamIdentity {
  teamId: number;
  teamAbv: string;
  logoUrl: string | null;
  latestIncludedGameId: string | null;
}

export interface MatchupLensGame {
  gameId: string;
  season: string | null;
  seasonType: string | null;
  week: string | null;
  gameDate: string | null;
  away: MatchupLensTeamIdentity;
  home: MatchupLensTeamIdentity;
}

export interface MatchupLensBasis {
  windowType: string;
  asOfDate: string;
  sourceDataDates: string[];
  maxDataLagDays: number;
  pregameSafe: boolean;
  comparisonNotForecast: boolean;
  rankingsSource: string | null;
  windowSource: string | null;
}

export interface MatchupLensSideReadiness {
  status: LensReadinessStatus;
  catalogEligibleMetricCount: number | null;
  eligibleNumericMetricCount: number | null;
  missingMetrics: string[];
}

export type LensReadinessStatus = "complete" | "partial" | "unavailable";

export interface MatchupLensLensReadiness {
  lensKey: string;
  lensName: string | null;
  status: LensReadinessStatus;
  away: MatchupLensSideReadiness | null;
  home: MatchupLensSideReadiness | null;
}

export interface MatchupLensWarning {
  code: string;
  /** Safe, user-presentable text only. */
  message: string;
  lensKey: string | null;
  teamSide: string | null;
  metrics: string[];
}

export interface MatchupLensCoverage {
  catalogMetricCount: number;
  awayMetricCount: number;
  homeMetricCount: number;
  sharedMetricCount: number;
  missingAwayMetrics: string[];
  missingHomeMetrics: string[];
  /** Always six rows, in the frozen lens order. */
  lensReadiness: MatchupLensLensReadiness[];
  /** Structured backend warnings. */
  warnings: MatchupLensWarning[];
  /** Safe, user-presentable warning messages only. */
  warningMessages: string[];
}

export interface MatchupLensLeagueContext {
  /** True when the payload carries only the two matchup teams. */
  suppressed: boolean;
  reasonCode: string | null;
  message: string | null;
}

export interface MatchupLensMethod {
  selection: string;
  frontendRole: string;
  forecast: false;
}

export interface AdaptedMatchupLensContext {
  snapshot: LensSnapshot;
  game: MatchupLensGame;
  basis: MatchupLensBasis;
  coverage: MatchupLensCoverage;
  leagueContext: MatchupLensLeagueContext;
  method: MatchupLensMethod;
}

const READINESS_STATUSES: readonly string[] = ["complete", "partial", "unavailable"];
const SIGNAL_STRENGTHS: readonly string[] = ["strong", "supporting", "context"];

function fail(detail: string): never {
  throw new MatchupLensContractError(detail);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) fail(`${path} must be a non-empty string`);
  return value;
}

function requireNullableString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") fail(`${path} must be a string or null`);
  return value;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${path} must be a finite number`);
  return value;
}

function requireNullableFiniteNumber(value: unknown, path: string): number | null {
  if (value === null || value === undefined) return null;
  return requireFiniteNumber(value, path);
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(`${path} must be a boolean`);
  return value;
}

function requireStatus(value: unknown, path: string): LensReadinessStatus {
  if (typeof value !== "string" || !READINESS_STATUSES.includes(value)) {
    fail(`${path} must be complete, partial or unavailable`);
  }
  return value as LensReadinessStatus;
}

function requireSignalStrength(value: unknown, path: string): MatchupLensV1SignalStrength {
  if (typeof value !== "string" || !SIGNAL_STRENGTHS.includes(value)) {
    fail(`${path} must be strong, supporting or context`);
  }
  return value as MatchupLensV1SignalStrength;
}

function requireTagList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(`${path} must be an array`);
  return value.map((tag, index) => requireString(tag, `${path}[${index}]`));
}

function optionalStringList(value: unknown, path: string): string[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) fail(`${path} must be an array or null`);
  return value.map((entry, index) => requireString(entry, `${path}[${index}]`));
}

/** Canonical decimal-string team ID -> safe integer. */
function safeTeamId(raw: unknown, path: string): number {
  if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) {
    fail(`${path} must be a canonical decimal integer string`);
  }
  const parsed = Number(raw.trim());
  if (!Number.isSafeInteger(parsed)) fail(`${path} is not a safe integer`);
  return parsed;
}

interface HeaderIdentity {
  teamId: number;
  teamAbv: string;
  logoUrl: string | null;
}

function adaptTeamHeader(raw: unknown, path: string): HeaderIdentity {
  if (!isRecord(raw)) fail(`${path} must be an object`);
  return {
    teamId: safeTeamId(raw.team_id, `${path}.team_id`),
    teamAbv: requireString(raw.team_abv, `${path}.team_abv`),
    logoUrl: requireNullableString(raw.logo_url ?? null, `${path}.logo_url`),
  };
}

/**
 * League percentiles are already polarity-corrected on a 0-100 scale. Only
 * finite in-range numbers are mapped; null omits the key; nothing becomes zero.
 */
function adaptPercentile(raw: unknown, path: string): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "number" || !Number.isFinite(raw)) fail(`${path} must be a finite number or null`);
  if (raw < 0 || raw > 100) fail(`${path} must be between 0 and 100`);
  return raw;
}

/** Metric metadata as carried by a team metric entry. */
interface MetricMeta {
  label: string;
  signal: MatchupLensV1SignalStrength;
  lensTags: string[];
}

function readMetricMeta(entry: Record<string, unknown>, path: string, key: string): MetricMeta {
  const metricName = requireString(entry.metric, `${path}.metric`);
  if (metricName !== key) fail(`${path} key does not match its metric name`);
  return {
    label: requireString(entry.label, `${path}.label`),
    signal: requireSignalStrength(entry.signal_strength, `${path}.signal_strength`),
    lensTags: requireTagList(entry.lens_tags, `${path}.lens_tags`),
  };
}

function sameMeta(a: MetricMeta, b: MetricMeta): boolean {
  return (
    a.label === b.label &&
    a.signal === b.signal &&
    a.lensTags.length === b.lensTags.length &&
    a.lensTags.every((tag, index) => tag === b.lensTags[index])
  );
}

/** Validates the catalog: ordered, unique, non-empty metric-name strings. */
function adaptCatalog(raw: unknown): string[] {
  if (!Array.isArray(raw)) fail("metric_catalog must be an array");
  const seen = new Set<string>();
  return raw.map((entry, index) => {
    const name = requireString(entry, `metric_catalog[${index}]`);
    if (seen.has(name)) fail(`metric_catalog[${index}] duplicates metric ${name}`);
    seen.add(name);
    return name;
  });
}

/** Reads one side's metric entries, validating shape and catalog membership. */
function readTeamMetrics(
  raw: unknown,
  path: string,
  catalog: Set<string>,
): Map<string, { meta: MetricMeta; percentile: number | null }> {
  if (!isRecord(raw)) fail(`${path} must be an object`);
  const result = new Map<string, { meta: MetricMeta; percentile: number | null }>();
  for (const [key, entry] of Object.entries(raw)) {
    const entryPath = `${path}.${key}`;
    if (!isRecord(entry)) fail(`${entryPath} must be an object`);
    if (!catalog.has(key)) fail(`${entryPath} is absent from metric_catalog`);
    const meta = readMetricMeta(entry, entryPath, key);
    result.set(key, {
      meta,
      percentile: adaptPercentile(entry.league_percentile, `${entryPath}.league_percentile`),
    });
  }
  return result;
}

function adaptTeamEvidence(
  raw: unknown,
  path: string,
  header: HeaderIdentity,
  catalog: Set<string>,
): {
  identity: MatchupLensTeamIdentity;
  metrics: Map<string, { meta: MetricMeta; percentile: number | null }>;
} {
  if (!isRecord(raw)) fail(`${path} must be an object`);

  const teamId = safeTeamId(raw.team_id, `${path}.team_id`);
  const teamAbv = requireString(raw.team_abv, `${path}.team_abv`);
  if (teamId !== header.teamId || teamAbv !== header.teamAbv) {
    fail(`${path} does not match the canonical game header`);
  }

  requireFiniteNumber(raw.games_in_window, `${path}.games_in_window`);
  requireString(raw.latest_source_date, `${path}.latest_source_date`);
  requireFiniteNumber(raw.data_lag_days, `${path}.data_lag_days`);

  return {
    identity: {
      teamId,
      teamAbv,
      logoUrl: header.logoUrl,
      latestIncludedGameId: requireNullableString(
        raw.latest_included_game_id ?? null,
        `${path}.latest_included_game_id`,
      ),
    },
    metrics: readTeamMetrics(raw.metrics, `${path}.metrics`, catalog),
  };
}

function buildMetricRow(
  raw: Record<string, unknown>,
  identity: MatchupLensTeamIdentity,
  metrics: Map<string, { meta: MetricMeta; percentile: number | null }>,
  scoringMetrics: Set<string>,
): TeamMetricRow {
  const percentiles: Record<string, number> = {};
  for (const [name, entry] of metrics) {
    // `context` evidence is valid transport but never enters scoring.
    if (!scoringMetrics.has(name)) continue;
    if (entry.percentile !== null) percentiles[name] = entry.percentile;
  }
  return {
    teamId: identity.teamId,
    teamAbv: identity.teamAbv,
    gamesInWindow: raw.games_in_window as number,
    latestSourceDate: raw.latest_source_date as string,
    dataLagDays: raw.data_lag_days as number,
    percentiles,
  };
}

function adaptSideReadiness(value: unknown, path: string): MatchupLensSideReadiness | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) fail(`${path} must be an object or null`);
  return {
    status: requireStatus(value.status, `${path}.status`),
    catalogEligibleMetricCount: requireNullableFiniteNumber(
      value.catalog_eligible_metric_count,
      `${path}.catalog_eligible_metric_count`,
    ),
    eligibleNumericMetricCount: requireNullableFiniteNumber(
      value.eligible_numeric_metric_count,
      `${path}.eligible_numeric_metric_count`,
    ),
    missingMetrics: optionalStringList(value.missing_metrics, `${path}.missing_metrics`),
  };
}

function adaptReadinessRow(raw: unknown, index: number): MatchupLensLensReadiness {
  const path = `coverage.lens_readiness[${index}]`;
  if (!isRecord(raw)) fail(`${path} must be an object`);
  const lensKey = requireString(raw.lens_key, `${path}.lens_key`);
  if (lensKey !== LENSES[index].key) {
    fail(`${path} is ${lensKey}; expected ${LENSES[index].key} in the frozen lens order`);
  }
  return {
    lensKey,
    lensName: requireNullableString(raw.display_name ?? null, `${path}.display_name`),
    status: requireStatus(raw.comparison_status, `${path}.comparison_status`),
    away: adaptSideReadiness(raw.away, `${path}.away`),
    home: adaptSideReadiness(raw.home, `${path}.home`),
  };
}

function adaptWarnings(raw: unknown): MatchupLensWarning[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) fail("coverage.warnings must be an array or null");
  return raw.map((entry, index) => {
    const path = `coverage.warnings[${index}]`;
    if (!isRecord(entry)) fail(`${path} must be an object`);
    return {
      code: requireString(entry.code, `${path}.code`),
      message: requireString(entry.message, `${path}.message`),
      lensKey: requireNullableString(entry.lens_key ?? null, `${path}.lens_key`),
      teamSide: requireNullableString(entry.team_side ?? null, `${path}.team_side`),
      metrics: optionalStringList(entry.metrics, `${path}.metrics`),
    };
  });
}

function adaptCoverage(raw: unknown): MatchupLensCoverage {
  if (!isRecord(raw)) fail("coverage must be an object");
  const rows = raw.lens_readiness;
  if (!Array.isArray(rows)) fail("coverage.lens_readiness must be an array");
  if (rows.length !== LENSES.length) {
    fail(`coverage.lens_readiness must contain exactly ${LENSES.length} rows`);
  }

  const warnings = adaptWarnings(raw.warnings);

  return {
    catalogMetricCount: requireFiniteNumber(raw.catalog_metric_count, "coverage.catalog_metric_count"),
    awayMetricCount: requireFiniteNumber(raw.away_metric_count, "coverage.away_metric_count"),
    homeMetricCount: requireFiniteNumber(raw.home_metric_count, "coverage.home_metric_count"),
    sharedMetricCount: requireFiniteNumber(raw.shared_metric_count, "coverage.shared_metric_count"),
    missingAwayMetrics: optionalStringList(raw.missing_away_metrics, "coverage.missing_away_metrics"),
    missingHomeMetrics: optionalStringList(raw.missing_home_metrics, "coverage.missing_home_metrics"),
    lensReadiness: rows.map(adaptReadinessRow),
    warnings,
    warningMessages: warnings.map((warning) => warning.message),
  };
}

function adaptBasis(raw: unknown): MatchupLensBasis {
  if (!isRecord(raw)) fail("basis must be an object");
  const dates = raw.source_data_dates;
  if (!Array.isArray(dates)) fail("basis.source_data_dates must be an array");
  return {
    windowType: requireString(raw.window_type, "basis.window_type"),
    asOfDate: requireString(raw.as_of_date, "basis.as_of_date"),
    sourceDataDates: dates.map((entry, index) =>
      requireString(entry, `basis.source_data_dates[${index}]`),
    ),
    maxDataLagDays: requireFiniteNumber(raw.max_data_lag_days, "basis.max_data_lag_days"),
    pregameSafe: requireBoolean(raw.pregame_safe, "basis.pregame_safe"),
    comparisonNotForecast: requireBoolean(
      raw.comparison_not_forecast,
      "basis.comparison_not_forecast",
    ),
    rankingsSource: requireNullableString(raw.rankings_source ?? null, "basis.rankings_source"),
    windowSource: requireNullableString(raw.window_source ?? null, "basis.window_source"),
  };
}

/**
 * Adapt an `available: true` envelope. An `available: false` envelope is a
 * valid product state handled by the caller, not a contract violation — it
 * must not be passed here.
 */
export function adaptMatchupLensV1(payload: MatchupLensV1Response): AdaptedMatchupLensContext {
  if (!isRecord(payload)) fail("response body must be an object");
  if (payload.schema_version !== MATCHUP_LENS_SCHEMA_VERSION) {
    fail(`schema_version must be ${MATCHUP_LENS_SCHEMA_VERSION}`);
  }
  if (payload.available !== true) fail("only an available response can be adapted");

  const gameRaw = payload.game;
  if (!isRecord(gameRaw)) fail("game must be an object");
  const awayHeader = adaptTeamHeader(gameRaw.away_team, "game.away_team");
  const homeHeader = adaptTeamHeader(gameRaw.home_team, "game.home_team");
  if (awayHeader.teamAbv === homeHeader.teamAbv) {
    fail("game.away_team and game.home_team are identical");
  }

  const displayRaw = payload.display;
  if (!isRecord(displayRaw)) fail("display must be an object");
  const basis = adaptBasis(payload.basis);

  const leagueRaw = payload.league_context;
  if (!isRecord(leagueRaw)) fail("league_context must be an object");
  const mode = requireString(leagueRaw.mode, "league_context.mode");
  if (mode !== "suppressed" && mode !== "available") {
    fail("league_context.mode must be suppressed or available");
  }

  const methodRaw = payload.method;
  if (!isRecord(methodRaw)) fail("method must be an object");
  // The contract freezes these three values exactly; nothing else is accepted.
  if (methodRaw.selection !== MATCHUP_LENS_V1_METHOD_SELECTION) {
    fail("method.selection does not match the frozen contract value");
  }
  if (methodRaw.frontend_role !== MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE) {
    fail("method.frontend_role does not match the frozen contract value");
  }
  if (methodRaw.forecast !== false) fail("method.forecast must be false");

  const catalogOrder = adaptCatalog(payload.metric_catalog);
  const catalog = new Set(catalogOrder);

  const teamsRaw = payload.teams;
  if (!isRecord(teamsRaw)) fail("teams must be an object");
  const awaySide = adaptTeamEvidence(teamsRaw.away, "teams.away", awayHeader, catalog);
  const homeSide = adaptTeamEvidence(teamsRaw.home, "teams.home", homeHeader, catalog);

  // Definitions follow catalog order; metadata comes from the union of sides
  // and must agree exactly wherever both sides carry the metric.
  const definitions: MetricDefinition[] = [];
  const scoringMetrics = new Set<string>();
  for (const name of catalogOrder) {
    const away = awaySide.metrics.get(name);
    const home = homeSide.metrics.get(name);
    if (!away && !home) fail(`metric_catalog entry ${name} has no team metadata`);
    if (away && home && !sameMeta(away.meta, home.meta)) {
      fail(`metric ${name} has conflicting metadata between the two teams`);
    }
    const meta = (away ?? home)!.meta;
    if (meta.signal === "context") continue;
    definitions.push({
      metric: name,
      label: meta.label,
      signalStrength: meta.signal as SignalStrength,
      lensTags: meta.lensTags,
    });
    scoringMetrics.add(name);
  }
  if (definitions.length === 0) fail("metric_catalog contains no scoring metrics");

  const awayRow = buildMetricRow(
    teamsRaw.away as Record<string, unknown>,
    awaySide.identity,
    awaySide.metrics,
    scoringMetrics,
  );
  const homeRow = buildMetricRow(
    teamsRaw.home as Record<string, unknown>,
    homeSide.identity,
    homeSide.metrics,
    scoringMetrics,
  );

  const coverage = adaptCoverage(payload.coverage);

  const snapshot: LensSnapshot = {
    asOfDate: basis.asOfDate,
    windowLabel: requireString(displayRaw.window_label, "display.window_label"),
    gamesLabel: requireString(displayRaw.games_label, "display.games_label"),
    contextLabel: requireString(displayRaw.context_label, "display.context_label"),
    metrics: definitions,
    teams: [awayRow, homeRow],
  };

  return {
    snapshot,
    game: {
      gameId: requireString(gameRaw.game_id, "game.game_id"),
      season: requireNullableString(gameRaw.season ?? null, "game.season"),
      seasonType: requireNullableString(gameRaw.season_type ?? null, "game.season_type"),
      week: requireNullableString(gameRaw.game_week ?? null, "game.game_week"),
      gameDate: requireNullableString(gameRaw.game_date ?? null, "game.game_date"),
      away: awaySide.identity,
      home: homeSide.identity,
    },
    basis,
    coverage,
    leagueContext: {
      suppressed: mode === "suppressed",
      reasonCode: requireNullableString(leagueRaw.reason_code ?? null, "league_context.reason_code"),
      message: requireNullableString(leagueRaw.message ?? null, "league_context.message"),
    },
    method: {
      selection: MATCHUP_LENS_V1_METHOD_SELECTION,
      frontendRole: MATCHUP_LENS_V1_METHOD_FRONTEND_ROLE,
      forecast: false,
    },
  };
}

/** Types referenced only for documentation of the wire shape. */
export type {
  MatchupLensV1Coverage,
  MatchupLensV1LensReadiness,
  MatchupLensV1TeamEvidence,
  MatchupLensV1Warning,
};
