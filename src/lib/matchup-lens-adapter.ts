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
  type MatchupLensV1CatalogMetric,
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
  teamName: string | null;
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
  window: string;
  asOfDate: string;
  sourceDataDate: string;
  latestIncludedGame: string | null;
}

export interface MatchupLensSideReadiness {
  status: LensReadinessStatus;
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

export interface MatchupLensCoverage {
  catalogMetricCount: number;
  awayMetricCount: number;
  homeMetricCount: number;
  sharedMetricCount: number;
  /** Always six rows, in the frozen lens order. */
  lensReadiness: MatchupLensLensReadiness[];
  namedMetricCoverage: Array<{ name: string; status: LensReadinessStatus; missingMetrics: string[] }>;
  /** Safe, user-presentable warning messages only. */
  warnings: string[];
}

export interface MatchupLensLeagueContext {
  /** True when the payload carries only the two matchup teams. */
  suppressed: boolean;
  reason: string | null;
}

export interface MatchupLensMethod {
  percentileBasis: string;
  polarity: string;
  notes: string | null;
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
  if (value === null) return null;
  if (typeof value !== "string") fail(`${path} must be a string or null`);
  return value;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${path} must be a finite number`);
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

function adaptTeamIdentity(raw: unknown, path: string): MatchupLensTeamIdentity {
  if (!isRecord(raw)) fail(`${path} must be an object`);
  return {
    teamId: safeTeamId(raw.team_id, `${path}.team_id`),
    teamAbv: requireString(raw.team_abv, `${path}.team_abv`),
    teamName: requireNullableString(raw.team_name ?? null, `${path}.team_name`),
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

function adaptTeamEvidence(
  raw: unknown,
  path: string,
  identity: MatchupLensTeamIdentity,
  scoringMetrics: Set<string>,
  catalogSignals: Map<string, MatchupLensV1SignalStrength>,
): TeamMetricRow {
  if (!isRecord(raw)) fail(`${path} must be an object`);

  const teamId = safeTeamId(raw.team_id, `${path}.team_id`);
  const teamAbv = requireString(raw.team_abv, `${path}.team_abv`);
  if (teamId !== identity.teamId || teamAbv !== identity.teamAbv) {
    fail(`${path} does not match the canonical game header`);
  }

  const metrics = raw.metrics;
  if (!isRecord(metrics)) fail(`${path}.metrics must be an object`);

  const percentiles: Record<string, number> = {};
  for (const [key, entry] of Object.entries(metrics)) {
    if (!isRecord(entry)) fail(`${path}.metrics.${key} must be an object`);
    const metricName = requireString(entry.metric, `${path}.metrics.${key}.metric`);
    if (metricName !== key) fail(`${path}.metrics.${key} key does not match its metric name`);
    const signal = requireSignalStrength(
      entry.signal_strength,
      `${path}.metrics.${key}.signal_strength`,
    );
    const catalogSignal = catalogSignals.get(metricName);
    if (catalogSignal === undefined) fail(`${path}.metrics.${key} is absent from metric_catalog`);
    if (catalogSignal !== signal) {
      fail(`${path}.metrics.${key}.signal_strength disagrees with metric_catalog`);
    }
    requireTagList(entry.lens_tags, `${path}.metrics.${key}.lens_tags`);
    // `context` evidence is valid transport but never enters scoring.
    if (!scoringMetrics.has(metricName)) continue;
    const percentile = adaptPercentile(
      entry.league_percentile,
      `${path}.metrics.${key}.league_percentile`,
    );
    if (percentile !== null) percentiles[metricName] = percentile;
  }

  return {
    teamId,
    teamAbv,
    gamesInWindow: requireFiniteNumber(raw.games_in_window, `${path}.games_in_window`),
    latestSourceDate: requireString(raw.latest_source_date, `${path}.latest_source_date`),
    dataLagDays: requireFiniteNumber(raw.data_lag_days, `${path}.data_lag_days`),
    percentiles,
  };
}

function adaptCatalog(raw: unknown): {
  definitions: MetricDefinition[];
  scoringMetrics: Set<string>;
  catalogSignals: Map<string, MatchupLensV1SignalStrength>;
} {
  if (!Array.isArray(raw)) fail("metric_catalog must be an array");
  const definitions: MetricDefinition[] = [];
  const scoringMetrics = new Set<string>();
  const catalogSignals = new Map<string, MatchupLensV1SignalStrength>();
  const seen = new Set<string>();

  raw.forEach((entry, index) => {
    const path = `metric_catalog[${index}]`;
    if (!isRecord(entry)) fail(`${path} must be an object`);
    const metric = requireString(entry.metric, `${path}.metric`);
    if (seen.has(metric)) fail(`${path} duplicates metric ${metric}`);
    seen.add(metric);
    const label = requireString(entry.label, `${path}.label`);
    const signal = requireSignalStrength(entry.signal_strength, `${path}.signal_strength`);
    const lensTags = requireTagList(entry.lens_tags, `${path}.lens_tags`);
    // Only strong and supporting become scoring definitions. `context` is
    // dropped outright — never coerced to another signal strength.
    if (signal === "context") return;
    definitions.push({ metric, label, signalStrength: signal as SignalStrength, lensTags });
    scoringMetrics.add(metric);
  });

  return { definitions, scoringMetrics };
}

function adaptReadinessRow(raw: unknown, index: number): MatchupLensLensReadiness {
  const path = `coverage.lens_readiness[${index}]`;
  if (!isRecord(raw)) fail(`${path} must be an object`);
  const lensKey = requireString(raw.lens_key, `${path}.lens_key`);
  if (lensKey !== LENSES[index].key) {
    fail(`${path} is ${lensKey}; expected ${LENSES[index].key} in the frozen lens order`);
  }
  const side = (value: unknown, sidePath: string): MatchupLensSideReadiness | null => {
    if (value === null || value === undefined) return null;
    if (!isRecord(value)) fail(`${sidePath} must be an object or null`);
    return {
      status: requireStatus(value.status, `${sidePath}.status`),
      missingMetrics: optionalStringList(value.missing_metrics, `${sidePath}.missing_metrics`),
    };
  };
  return {
    lensKey,
    lensName: requireNullableString(raw.lens_name ?? null, `${path}.lens_name`),
    status: requireStatus(raw.status, `${path}.status`),
    away: side(raw.away, `${path}.away`),
    home: side(raw.home, `${path}.home`),
  };
}

function adaptCoverage(raw: unknown, warnings: string[]): MatchupLensCoverage {
  if (!isRecord(raw)) fail("coverage must be an object");
  const rows = raw.lens_readiness;
  if (!Array.isArray(rows)) fail("coverage.lens_readiness must be an array");
  if (rows.length !== LENSES.length) {
    fail(`coverage.lens_readiness must contain exactly ${LENSES.length} rows`);
  }

  const named = raw.named_metric_coverage;
  if (named !== null && named !== undefined && !Array.isArray(named)) {
    fail("coverage.named_metric_coverage must be an array or null");
  }

  return {
    catalogMetricCount: requireFiniteNumber(raw.catalog_metric_count, "coverage.catalog_metric_count"),
    awayMetricCount: requireFiniteNumber(raw.away_metric_count, "coverage.away_metric_count"),
    homeMetricCount: requireFiniteNumber(raw.home_metric_count, "coverage.home_metric_count"),
    sharedMetricCount: requireFiniteNumber(raw.shared_metric_count, "coverage.shared_metric_count"),
    lensReadiness: rows.map(adaptReadinessRow),
    namedMetricCoverage: (Array.isArray(named) ? named : []).map((entry, index) => {
      const path = `coverage.named_metric_coverage[${index}]`;
      if (!isRecord(entry)) fail(`${path} must be an object`);
      return {
        name: requireString(entry.name, `${path}.name`),
        status: requireStatus(entry.status, `${path}.status`),
        missingMetrics: optionalStringList(entry.missing_metrics, `${path}.missing_metrics`),
      };
    }),
    warnings,
  };
}

function adaptWarnings(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) fail("warnings must be an array or null");
  return raw
    .map((entry, index) => {
      if (!isRecord(entry)) fail(`warnings[${index}] must be an object`);
      return requireString(entry.message, `warnings[${index}].message`);
    })
    .filter((message) => message.length > 0);
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
  const away = adaptTeamIdentity(gameRaw.away_team, "game.away_team");
  const home = adaptTeamIdentity(gameRaw.home_team, "game.home_team");
  if (away.teamAbv === home.teamAbv) fail("game.away_team and game.home_team are identical");

  const displayRaw = payload.display;
  if (!isRecord(displayRaw)) fail("display must be an object");
  const basisRaw = payload.basis;
  if (!isRecord(basisRaw)) fail("basis must be an object");

  const leagueRaw = payload.league_context;
  if (!isRecord(leagueRaw)) fail("league_context must be an object");
  const mode = requireString(leagueRaw.mode, "league_context.mode");
  if (mode !== "suppressed" && mode !== "available") {
    fail("league_context.mode must be suppressed or available");
  }

  const methodRaw = payload.method;
  if (!isRecord(methodRaw)) fail("method must be an object");

  const { definitions, scoringMetrics } = adaptCatalog(payload.metric_catalog);
  if (definitions.length === 0) fail("metric_catalog contains no scoring metrics");

  const awayRow = adaptTeamEvidence(payload.away, "away", away, scoringMetrics);
  const homeRow = adaptTeamEvidence(payload.home, "home", home, scoringMetrics);

  const warnings = adaptWarnings(payload.warnings);
  const coverage = adaptCoverage(payload.coverage, warnings);

  const snapshot: LensSnapshot = {
    asOfDate: requireString(basisRaw.as_of_date, "basis.as_of_date"),
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
      week: requireNullableString(gameRaw.week ?? null, "game.week"),
      gameDate: requireNullableString(gameRaw.game_date ?? null, "game.game_date"),
      away,
      home,
    },
    basis: {
      window: requireString(basisRaw.window, "basis.window"),
      asOfDate: requireString(basisRaw.as_of_date, "basis.as_of_date"),
      sourceDataDate: requireString(basisRaw.source_data_date, "basis.source_data_date"),
      latestIncludedGame: requireNullableString(
        basisRaw.latest_included_game ?? null,
        "basis.latest_included_game",
      ),
    },
    coverage,
    leagueContext: {
      suppressed: mode === "suppressed",
      reason: requireNullableString(leagueRaw.reason ?? null, "league_context.reason"),
    },
    method: {
      percentileBasis: requireString(methodRaw.percentile_basis, "method.percentile_basis"),
      polarity: requireString(methodRaw.polarity, "method.polarity"),
      notes: requireNullableString(methodRaw.notes ?? null, "method.notes"),
    },
  };
}

/** Types referenced only for documentation of the wire shape. */
export type {
  MatchupLensV1CatalogMetric,
  MatchupLensV1Coverage,
  MatchupLensV1LensReadiness,
  MatchupLensV1TeamEvidence,
  MatchupLensV1Warning,
};
