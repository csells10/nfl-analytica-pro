/**
 * GameLens Run Visibility — frontend data contract + authenticated adapter.
 *
 * Everything the Run Visibility page renders comes from `getRunVisibility(filters)`,
 * which issues one protected request to
 *   GET /admin/gamelens/run-visibility
 * against the dedicated development service (see `run-visibility-api.ts`).
 *
 * The endpoint is read-only and development-only: no write, retry or backfill
 * surface exists in this contract by design. There is no mock fallback — a
 * failed request surfaces as an honest error state in the UI.
 */

import { requestRunVisibility, RunVisibilityError } from "@/lib/run-visibility-api";

// ---------- Filters ----------

export type SeasonType = "preseason" | "regular" | "postseason";

export type DatePreset = "current_week" | "recent_18_days" | "custom" | "season_to_date";

export interface RunVisibilityFilters {
  season: string;
  seasonType: SeasonType;
  /** Required by the endpoint even though it is not a visible control. */
  learningRunId: string;
  datePreset: DatePreset;
  startDate?: string;
  endDate?: string;
  /** Week filter, e.g. "preseason_week_1". Undefined = all visible weeks. */
  gameWeek?: string;
  /** When present the endpoint returns full stage evidence for that game. */
  gameId?: string;
  limit?: number;
}

export const DEFAULT_LEARNING_RUN_ID = "gamelens_2026_preseason_v1";

/** The protected endpoint accepts a maximum 31-day inclusive window. */
export const MAX_RANGE_DAYS = 31;

/** The endpoint returns at most 50 game rows. */
export const DEFAULT_LIMIT = 50;

/** Season to Date is a design exploration; the 31-day cap forbids it. */
export const UNSUPPORTED_PRESETS: DatePreset[] = ["season_to_date"];

export function isPresetSupported(preset: DatePreset): boolean {
  return !UNSUPPORTED_PRESETS.includes(preset);
}

/** Backend casing for season_type; the UI keeps its lowercase union. */
const SEASON_TYPE_PARAM: Record<SeasonType, string> = {
  preseason: "Preseason",
  regular: "Regular",
  postseason: "Postseason",
};

export interface RunVisibilityApiParams {
  season: string;
  season_type: string;
  learning_run_id: string;
  start_date: string;
  end_date: string;
  game_week?: string;
  game_id?: string;
  limit?: number;
}

export function toApiParams(filters: RunVisibilityFilters): RunVisibilityApiParams {
  const { startDate, endDate } = resolveRange(filters);
  return {
    season: filters.season,
    season_type: SEASON_TYPE_PARAM[filters.seasonType] ?? filters.seasonType,
    learning_run_id: filters.learningRunId || DEFAULT_LEARNING_RUN_ID,
    start_date: startDate,
    end_date: endDate,
    game_week: filters.gameWeek,
    game_id: filters.gameId,
    limit: filters.limit ?? DEFAULT_LIMIT,
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Inclusive day count between two YYYY-MM-DD dates. */
export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.NaN;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function resolveRange(filters: RunVisibilityFilters): { startDate: string; endDate: string } {
  const today = toIsoDate(new Date());

  if (filters.datePreset === "custom" && filters.startDate && filters.endDate) {
    return { startDate: filters.startDate, endDate: filters.endDate };
  }
  if (filters.datePreset === "current_week") {
    return { startDate: shiftDays(today, -6), endDate: today };
  }
  if (filters.datePreset === "season_to_date") {
    // Exploration only — the endpoint caps at 31 inclusive days.
    return { startDate: shiftDays(today, -(MAX_RANGE_DAYS - 1)), endDate: today };
  }
  return { startDate: shiftDays(today, -17), endDate: today };
}

// ---------- Status vs. attention ----------

/** What the pipeline stage did. */
export type StageStatus =
  | "complete"
  | "waiting"
  | "no_work_needed"
  | "not_applicable"
  | "warning"
  | "failed";

/** Whether a human still needs to do something about it. */
export type Attention = "none" | "known_gap" | "action_required";

export interface StateCell {
  status: StageStatus;
  attention: Attention;
  /** True when a rollup covers stages that disagree; rendered neutrally. */
  mixed?: boolean;
  /** Optional short override label for rollups. */
  label?: string;
}

const STAGE_STATUSES: StageStatus[] = [
  "complete",
  "waiting",
  "no_work_needed",
  "not_applicable",
  "warning",
  "failed",
];

const ATTENTIONS: Attention[] = ["none", "known_gap", "action_required"];

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Unknown future statuses render neutrally instead of crashing. */
export function parseStageStatus(value: unknown): { status: StageStatus; label?: string } {
  if (typeof value === "string" && (STAGE_STATUSES as string[]).includes(value)) {
    return { status: value as StageStatus };
  }
  if (typeof value === "string" && value.length > 0) {
    return { status: "not_applicable", label: titleCase(value) };
  }
  return { status: "not_applicable" };
}

export function parseAttention(value: unknown): Attention {
  return typeof value === "string" && (ATTENTIONS as string[]).includes(value)
    ? (value as Attention)
    : "none";
}

/** Rollup states carried by `state` on clocks, games, days and weeks. */
export function parseRollupState(value: unknown): StateCell {
  switch (value) {
    case "needs_attention":
      return { status: "warning", attention: "action_required" };
    case "known_gap":
      return { status: "warning", attention: "known_gap" };
    case "mixed":
      return { status: "complete", attention: "none", mixed: true };
    case "warning":
    case "waiting":
    case "not_applicable":
    case "complete":
    case "no_work_needed":
    case "failed":
      return { status: value as StageStatus, attention: "none" };
    default: {
      const parsed = parseStageStatus(value);
      return { status: parsed.status, attention: "none", label: parsed.label };
    }
  }
}

// ---------- Response types ----------

export type ClockKey = "daily_data_load" | "gamelens_pregame" | "postgame_learning";

/** Backend clock keys → the frontend clock identities the UI already renders. */
const CLOCK_KEY_BY_API: Record<string, ClockKey> = {
  data_load: "daily_data_load",
  pregame: "gamelens_pregame",
  postgame: "postgame_learning",
};

const CLOCK_ORDER: Array<{ apiKey: keyof ApiClocks; key: ClockKey; name: string; description: string }> = [
  {
    apiKey: "data_load",
    key: "daily_data_load",
    name: "Daily Data Load",
    description: "Confirms the regular NFL data load reached this game.",
  },
  {
    apiKey: "pregame",
    key: "gamelens_pregame",
    name: "GameLens Pregame",
    description: "Evidence that had to be frozen before kickoff to be truthful.",
  },
  {
    apiKey: "postgame",
    key: "postgame_learning",
    name: "Postgame Learning",
    description: "Grading and learning levels produced after the game concluded.",
  },
];

export interface StageEvidence {
  key: string;
  name: string;
  status: StageStatus;
  attention: Attention;
  count?: number;
  reason?: string;
  canonical_source?: string;
  timestamp?: string;
  retryable?: boolean;
  note?: string;
  /** Raw backend fields, shown in a secondary "Raw evidence" area. */
  raw?: Record<string, string | number | boolean | null>;
}

export interface ClockEvidence {
  key: ClockKey;
  name: string;
  description: string;
  status: StageStatus;
  attention: Attention;
  mixed?: boolean;
  label?: string;
  stages: StageEvidence[];
}

export interface GameRow {
  game_id: string;
  matchup: string;
  kickoff_utc: string;
  kickoff_label: string;
  kickoff_time_label: string;
  /** Calendar day the game belongs to, e.g. "2026-08-13". */
  game_date: string;
  /** Friendly day label, e.g. "Thursday, August 13". */
  day_label: string;
  game_week: string;
  week_label: string;
  game_status: string;
  overall: StateCell;
  daily_data_load: StateCell;
  gamelens_pregame: StateCell;
  postgame_learning: StateCell;
  first_issue?: string;
  /** Derived: pregame clock contains stage `snapshot` with status `complete`. */
  captured: boolean;
  detail_available: boolean;
  learning_run_id: string;
}

export interface GameDetail extends GameRow {
  clocks: ClockEvidence[];
  /** Only available on the detail payload, via `lineage.capture_id`. */
  capture_id?: string;
  traceability?: Record<string, string | number | boolean | null>;
}

export interface WeekSummary {
  game_week: string;
  label: string;
  date_label: string;
  scheduled: number;
  captured: number;
  needs_attention: number;
  known_gaps: number;
}

/** One operational day, derived in the adapter from the compact game rows. */
export interface DaySummary {
  game_date: string;
  label: string;
  short_label: string;
  game_week: string;
  week_label: string;
  scheduled: number;
  captured: number;
  needs_attention: number;
  known_gaps: number;
  /** One calm rollup state for the collapsed day row. */
  overall: StateCell;
  /** e.g. "6 games · 5 captured · 1 known gap". */
  summary: string;
}

export interface AttentionItem {
  id: string;
  game_id: string;
  matchup: string;
  week_label: string;
  game_date: string;
  day_label: string;
  clock: string;
  stage: string;
  status: StageStatus;
  attention: Attention;
  reason: string;
}

export interface RunAttempt {
  attempt_id: string;
  source: string;
  display_label: string;
  scope_label: string;
  stage: string;
  status: StageStatus;
  attention: Attention;
  reason?: string;
  input_count?: number;
  output_count?: number;
  duration_ms?: number;
  finished_at?: string;
}

export interface RunVisibilityOverview {
  source_tables_available: number;
  source_tables_total: number;
  scheduled_games: number;
  canonical_captures: number;
  needs_attention: number;
  known_gaps: number;
  returned: number;
  truncated: boolean;
  recent_run_count: number;
  weeks: WeekSummary[];
  days: DaySummary[];
  games: GameRow[];
}

export interface RunVisibilityResponse {
  available: boolean;
  access_mode?: string;
  scope?: string;
  source_profile?: string;
  generated_at: string;
  overview: RunVisibilityOverview;
  attention: {
    needs_attention: AttentionItem[];
    known_gaps: AttentionItem[];
  };
  recent_runs: RunAttempt[];
  days: DaySummary[];
  games: GameRow[];
  selected_game: GameDetail | null;
}

// ---------- Raw backend shapes ----------

interface ApiStage {
  stage?: string;
  status?: string;
  attention?: string;
  count?: number;
  reason?: string;
  source?: string;
  details?: Record<string, unknown>;
}

interface ApiClock {
  id?: string;
  label?: string;
  state?: string;
  stages?: ApiStage[];
}

interface ApiClocks {
  data_load?: ApiClock;
  pregame?: ApiClock;
  postgame?: ApiClock;
}

interface ApiGame {
  game_id?: string;
  game_week?: string;
  matchup?: string;
  game_date?: string;
  scheduled_kickoff?: string;
  game_status?: string;
  state?: string;
  first_issue?: string;
  clocks?: ApiClocks;
  detail_available?: boolean;
  season?: string;
  season_type?: string;
  lineage?: { learning_run_id?: string; capture_id?: string };
  traceability?: Record<string, unknown>;
}

interface ApiWeek {
  game_week?: string;
  label?: string;
  date_label?: string;
  scheduled?: number;
  captured?: number;
  need_attention?: number;
  needs_attention?: number;
  known_gaps?: number;
}

interface ApiAttentionItem {
  game_id?: string;
  matchup?: string;
  game_date?: string;
  game_week?: string;
  week_label?: string;
  clock?: string;
  clock_label?: string;
  stage?: string;
  stage_label?: string;
  status?: string;
  attention?: string;
  reason?: string;
}

interface ApiRun {
  source?: string;
  display_label?: string;
  scope_label?: string;
  attempt_id?: string;
  stage?: string;
  status?: string;
  reason?: string;
  input_count?: number;
  output_count?: number;
  duration_ms?: number;
  finished_at?: string;
}

interface ApiResponse {
  available?: boolean;
  access_mode?: string;
  scope?: string;
  source_profile?: string;
  generated_at?: string;
  overview?: {
    source_health?: Record<string, unknown>;
    weeks?: ApiWeek[];
    games?: {
      scheduled?: number;
      captured?: number;
      need_attention?: number;
      known_gaps?: number;
      returned?: number;
      truncated?: boolean;
    };
    recent_run_count?: number;
  };
  attention?: { needs_attention?: ApiAttentionItem[]; known_gaps?: ApiAttentionItem[] };
  recent_runs?: ApiRun[];
  games?: ApiGame[];
  selected_game?: ApiGame | null;
}

// ---------- Labels ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDateParts(isoDate: string): [number, number, number] | null {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

/** "Thursday, August 13" */
export function dayLabel(isoDate: string): string {
  const parts = parseDateParts(isoDate);
  if (!parts) return isoDate;
  const [y, m, d] = parts;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${FULL_MONTHS[m - 1]} ${d}`;
}

/** "Thu Aug 13" */
export function shortDayLabel(isoDate: string): string {
  const parts = parseDateParts(isoDate);
  if (!parts) return isoDate;
  const [y, m, d] = parts;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3);
  return `${weekday} ${MONTHS[m - 1]} ${d}`;
}

function kickoffLabels(kickoffUtc: string): { full: string; time: string } {
  const ms = Date.parse(kickoffUtc);
  if (Number.isNaN(ms)) return { full: kickoffUtc, time: kickoffUtc };
  const date = new Date(ms);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const time = `${hh}:${mm} UTC`;
  return {
    full: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} · ${time}`,
    time,
  };
}

function weekLabelFallback(gameWeek: string): string {
  return gameWeek ? titleCase(gameWeek) : "Unknown week";
}

// ---------- Normalization ----------

function toRawRecord(details?: Record<string, unknown>): Record<string, string | number | boolean | null> | undefined {
  if (!details || typeof details !== "object") return undefined;
  const raw: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(details)) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      raw[key] = value as string | number | boolean | null;
    } else {
      raw[key] = JSON.stringify(value);
    }
  }
  return Object.keys(raw).length > 0 ? raw : undefined;
}

function normalizeStage(stage: ApiStage): StageEvidence {
  const parsed = parseStageStatus(stage.status);
  const key = stage.stage ?? "stage";
  return {
    key,
    name: titleCase(key),
    status: parsed.status,
    attention: parseAttention(stage.attention),
    count: typeof stage.count === "number" ? stage.count : undefined,
    reason: stage.reason,
    canonical_source: stage.source,
    raw: toRawRecord(stage.details),
  };
}

function normalizeClock(apiClock: ApiClock | undefined, meta: (typeof CLOCK_ORDER)[number]): ClockEvidence {
  const state = parseRollupState(apiClock?.state);
  return {
    key: meta.key,
    name: apiClock?.label ?? meta.name,
    description: meta.description,
    status: state.status,
    attention: state.attention,
    mixed: state.mixed,
    label: state.label,
    stages: (apiClock?.stages ?? []).map(normalizeStage),
  };
}

function normalizeClocks(clocks: ApiClocks | undefined): ClockEvidence[] {
  return CLOCK_ORDER.map((meta) => normalizeClock(clocks?.[meta.apiKey], meta));
}

/** A game counts as captured only when its pregame snapshot stage completed. */
export function isCaptured(clocks: ApiClocks | undefined): boolean {
  const stages = clocks?.pregame?.stages ?? [];
  return stages.some((stage) => stage.stage === "snapshot" && stage.status === "complete");
}

function cellFrom(clock: ClockEvidence): StateCell {
  return { status: clock.status, attention: clock.attention, mixed: clock.mixed, label: clock.label };
}

function normalizeGame(game: ApiGame, learningRunId: string): GameDetail {
  const clocks = normalizeClocks(game.clocks);
  const [dataLoad, pregame, postgame] = clocks;
  const gameDate = game.game_date ?? (game.scheduled_kickoff ?? "").slice(0, 10);
  const kickoff = kickoffLabels(game.scheduled_kickoff ?? "");
  const gameWeek = game.game_week ?? "";

  return {
    game_id: game.game_id ?? "",
    matchup: game.matchup ?? game.game_id ?? "Unknown matchup",
    kickoff_utc: game.scheduled_kickoff ?? "",
    kickoff_label: kickoff.full,
    kickoff_time_label: kickoff.time,
    game_date: gameDate,
    day_label: dayLabel(gameDate),
    game_week: gameWeek,
    week_label: weekLabelFallback(gameWeek),
    game_status: game.game_status ?? "Unknown",
    overall: parseRollupState(game.state),
    daily_data_load: cellFrom(dataLoad),
    gamelens_pregame: cellFrom(pregame),
    postgame_learning: cellFrom(postgame),
    first_issue: game.first_issue,
    captured: isCaptured(game.clocks),
    detail_available: game.detail_available !== false,
    learning_run_id: game.lineage?.learning_run_id ?? learningRunId,
    clocks,
    capture_id: game.lineage?.capture_id,
    traceability: toRawRecord(game.traceability),
  };
}

function toRow(detail: GameDetail): GameRow {
  const { clocks: _clocks, capture_id: _captureId, traceability: _trace, ...row } = detail;
  return row;
}

function normalizeWeek(week: ApiWeek): WeekSummary {
  const gameWeek = week.game_week ?? "";
  return {
    game_week: gameWeek,
    label: week.label ?? weekLabelFallback(gameWeek),
    date_label: week.date_label ?? "",
    scheduled: week.scheduled ?? 0,
    captured: week.captured ?? 0,
    needs_attention: week.needs_attention ?? week.need_attention ?? 0,
    known_gaps: week.known_gaps ?? 0,
  };
}

function normalizeAttentionItem(item: ApiAttentionItem, index: number, weekLabels: Map<string, string>): AttentionItem {
  const gameDate = item.game_date ?? "";
  const gameWeek = item.game_week ?? "";
  const stage = item.stage_label ?? item.stage ?? "";
  const clock = item.clock_label ?? item.clock ?? "";
  const parsed = parseStageStatus(item.status);
  return {
    id: `${item.game_id ?? "game"}:${clock}:${stage}:${index}`,
    game_id: item.game_id ?? "",
    matchup: item.matchup ?? item.game_id ?? "Unknown matchup",
    week_label: item.week_label ?? weekLabels.get(gameWeek) ?? weekLabelFallback(gameWeek),
    game_date: gameDate,
    day_label: gameDate ? dayLabel(gameDate) : "",
    clock: CLOCK_KEY_BY_API[clock] ? titleCase(clock) : titleCase(clock),
    stage: titleCase(stage),
    status: parsed.status,
    attention: parseAttention(item.attention),
    reason: item.reason ?? "",
  };
}

function normalizeRun(run: ApiRun, index: number): RunAttempt {
  const parsed = parseStageStatus(run.status);
  return {
    attempt_id: run.attempt_id ?? `attempt_${index}`,
    source: run.source ?? "",
    display_label: run.display_label ?? run.attempt_id ?? "Run attempt",
    scope_label: run.scope_label ?? "",
    stage: run.stage ?? "",
    status: parsed.status,
    attention: "none",
    reason: run.reason,
    input_count: run.input_count,
    output_count: run.output_count,
    duration_ms: run.duration_ms,
    finished_at: run.finished_at,
  };
}

function readCount(source: Record<string, unknown> | undefined, keys: string[]): number {
  if (!source) return 0;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") return value;
  }
  return 0;
}

function sourceHealth(health: Record<string, unknown> | undefined): { available: number; total: number } {
  if (Array.isArray(health)) {
    const tables = health as Array<{ available?: boolean }>;
    return { available: tables.filter((t) => t.available !== false).length, total: tables.length };
  }
  if (!health) return { available: 0, total: 0 };

  // Primary backend count fields (documented contract).
  let available = readCount(health, ["available_count"]);
  let total = readCount(health, ["table_count"]);

  // Defensive fallbacks for older or alternate shapes.
  if (available === 0) available = readCount(health, ["available", "tables_available", "sources_available"]);
  if (total === 0) total = readCount(health, ["total", "tables_total", "sources_total"]);

  // Final fallback: the tables array length.
  const tables = health.tables;
  if (total === 0 && Array.isArray(tables)) {
    total = tables.length;
    if (available === 0) {
      available = (tables as Array<{ available?: boolean }>).filter((t) => t.available !== false).length;
    }
  }

  return { available, total };
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function overallRollup(cells: StateCell[]): StateCell {
  if (cells.length === 0) return { status: "not_applicable", attention: "none" };
  const attention: Attention = cells.some((c) => c.attention === "action_required")
    ? "action_required"
    : cells.some((c) => c.attention === "known_gap")
      ? "known_gap"
      : "none";
  if (cells.some((c) => c.status === "failed")) return { status: "failed", attention };
  if (attention !== "none") return { status: "warning", attention };
  if (cells.some((c) => c.status === "waiting")) return { status: "waiting", attention };
  if (cells.every((c) => c.status === "not_applicable")) return { status: "not_applicable", attention };
  return { status: "complete", attention };
}

/**
 * Day summaries are derived from the same canonical game rows — no component
 * ever reclassifies a backend status. The endpoint returns week rollups only.
 */
export function buildDays(rows: GameRow[], attention: { needs_attention: AttentionItem[]; known_gaps: AttentionItem[] }): DaySummary[] {
  const dates = Array.from(new Set(rows.map((row) => row.game_date))).sort();

  return dates.map((date) => {
    const games = rows.filter((row) => row.game_date === date);
    const captured = games.filter((row) => row.captured).length;
    const needsAttention = attention.needs_attention.filter((item) => item.game_date === date).length;
    const knownGaps = attention.known_gaps.filter((item) => item.game_date === date).length;

    const parts = [plural(games.length, "game"), `${captured} captured`];
    if (needsAttention > 0) parts.push(`${needsAttention} needs attention`);
    if (knownGaps > 0) parts.push(plural(knownGaps, "known gap"));

    return {
      game_date: date,
      label: dayLabel(date),
      short_label: shortDayLabel(date),
      game_week: games[0]?.game_week ?? "",
      week_label: games[0]?.week_label ?? "",
      scheduled: games.length,
      captured,
      needs_attention: needsAttention,
      known_gaps: knownGaps,
      overall: overallRollup(games.map((row) => row.overall)),
      summary: parts.join(" · "),
    };
  });
}

export function normalizeRunVisibility(raw: unknown, learningRunId: string): RunVisibilityResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new RunVisibilityError("invalid_response", "Run Visibility returned an unreadable response.");
  }
  const body = raw as ApiResponse;

  const weeks = (body.overview?.weeks ?? []).map(normalizeWeek);
  const weekLabels = new Map(weeks.map((week) => [week.game_week, week.label]));

  const details = (body.games ?? []).map((game) => normalizeGame(game, learningRunId));
  const rows = details.map(toRow);

  const attention = {
    needs_attention: (body.attention?.needs_attention ?? []).map((item, index) =>
      normalizeAttentionItem(item, index, weekLabels),
    ),
    known_gaps: (body.attention?.known_gaps ?? []).map((item, index) =>
      normalizeAttentionItem(item, index, weekLabels),
    ),
  };

  // Week labels are the only authoritative source for a game's week name.
  for (const row of rows) {
    const label = weekLabels.get(row.game_week);
    if (label) row.week_label = label;
  }

  const days = buildDays(rows, attention);
  const health = sourceHealth(body.overview?.source_health);
  const gameCounts = body.overview?.games;

  return {
    available: body.available !== false,
    access_mode: body.access_mode,
    scope: body.scope,
    source_profile: body.source_profile,
    generated_at: body.generated_at ?? "",
    overview: {
      source_tables_available: health.available,
      source_tables_total: health.total,
      scheduled_games: gameCounts?.scheduled ?? rows.length,
      canonical_captures: gameCounts?.captured ?? rows.filter((row) => row.captured).length,
      needs_attention: gameCounts?.need_attention ?? attention.needs_attention.length,
      known_gaps: gameCounts?.known_gaps ?? attention.known_gaps.length,
      returned: gameCounts?.returned ?? rows.length,
      truncated: gameCounts?.truncated === true,
      recent_run_count: body.overview?.recent_run_count ?? (body.recent_runs?.length ?? 0),
      weeks,
      days,
      games: rows,
    },
    attention,
    recent_runs: (body.recent_runs ?? []).map(normalizeRun),
    days,
    games: rows,
    selected_game: body.selected_game ? normalizeGame(body.selected_game, learningRunId) : null,
  };
}

// ---------- Adapter ----------

/**
 * Single swappable data source for the Run Visibility page.
 *
 * Passing `gameId` is what returns `selected_game` with full stage evidence —
 * the overview payload only carries compact rows.
 */
export async function getRunVisibility(filters: RunVisibilityFilters): Promise<RunVisibilityResponse> {
  const params = toApiParams(filters);

  const days = inclusiveDayCount(params.start_date, params.end_date);
  if (!Number.isFinite(days) || days < 1 || days > MAX_RANGE_DAYS) {
    throw new RunVisibilityError(
      "range_too_large",
      `Select a range between 1 and ${MAX_RANGE_DAYS} days.`,
    );
  }

  const raw = await requestRunVisibility(params);
  return normalizeRunVisibility(raw, params.learning_run_id);
}
