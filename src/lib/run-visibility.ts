/**
 * GameLens Run Visibility — frontend data contract + mock adapter.
 *
 * Everything the Run Visibility page renders comes from `getRunVisibility(filters)`.
 * Later this single function will issue one protected request to
 *   GET /admin/gamelens/run-visibility
 * and the components above it will not change.
 *
 * The backend is read-only and development-only: no write, retry or backfill
 * surface exists in this contract by design.
 */

// ---------- Filters ----------

export type SeasonType = "preseason" | "regular" | "postseason";

export type DatePreset = "current_week" | "recent_18_days" | "custom" | "season_to_date";

export interface RunVisibilityFilters {
  season: string;
  seasonType: SeasonType;
  /** Required by the real endpoint even though it is not a visible control. */
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

/** The protected endpoint accepts a maximum 31-day window today. */
export const MAX_RANGE_DAYS = 31;

/** Season to Date is a design exploration; no backend support exists yet. */
export const UNSUPPORTED_PRESETS: DatePreset[] = ["season_to_date"];

export function isPresetSupported(preset: DatePreset): boolean {
  return !UNSUPPORTED_PRESETS.includes(preset);
}

/** Shape the future request will actually use. */
export interface RunVisibilityApiParams {
  season: string;
  season_type: SeasonType;
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
    season_type: filters.seasonType,
    learning_run_id: filters.learningRunId,
    start_date: startDate,
    end_date: endDate,
    game_week: filters.gameWeek,
    game_id: filters.gameId,
    limit: filters.limit,
  };
}

export function resolveRange(filters: RunVisibilityFilters): { startDate: string; endDate: string } {
  if (filters.datePreset === "custom" && filters.startDate && filters.endDate) {
    return { startDate: filters.startDate, endDate: filters.endDate };
  }
  if (filters.datePreset === "current_week") {
    return { startDate: "2026-08-13", endDate: "2026-08-15" };
  }
  if (filters.datePreset === "season_to_date") {
    // Exploration only — a season-wide week index does not exist yet.
    return { startDate: "2026-08-01", endDate: "2026-08-20" };
  }
  return { startDate: "2026-08-03", endDate: "2026-08-20" };
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

// ---------- Response ----------

export type ClockKey = "daily_data_load" | "gamelens_pregame" | "postgame_learning";

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
  stages: StageEvidence[];
}

export interface GameRow {
  game_id: string;
  matchup: string;
  away: string;
  home: string;
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
  capture_id?: string;
  learning_run_id: string;
}

export interface GameDetail extends GameRow {
  clocks: ClockEvidence[];
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

/** One operational day, derived from each game's game_date. */
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
  label: string;
  stage: string;
  status: StageStatus;
  attention: Attention;
  games_in_scope: number;
  games_completed: number;
  reason?: string;
  source_receipt_table: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  input_count: number;
  output_count: number;
  raw_reason?: string;
  /** Operational days this attempt covered; used to relate runs to a day. */
  related_dates: string[];
}

export interface RunVisibilityOverview {
  source_tables_available: number;
  source_tables_total: number;
  scheduled_games: number;
  canonical_captures: number;
  needs_attention: number;
  known_gaps: number;
  weeks: WeekSummary[];
  days: DaySummary[];
  games: GameRow[];
}

export interface RunVisibilityResponse {
  generated_at: string;
  environment: string;
  read_only: boolean;
  params_echo: RunVisibilityApiParams;
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

// ---------- Mock data ----------

const GENERATED_AT = "2026-08-20T18:05:00Z";

const HOF_WEEK = "hall_of_fame_weekend";
const PRE_1 = "preseason_week_1";

const WEEK_LABELS: Record<string, string> = {
  [HOF_WEEK]: "Hall of Fame Weekend",
  [PRE_1]: "Preseason Week 1",
};

interface Seed {
  away: string;
  home: string;
  date: string;
  time: string;
  week: string;
  /** Pregame snapshot preserved before kickoff. */
  captured: boolean;
  /** Level 1 receipt missing even though the snapshot exists. */
  level1Gap?: boolean;
  postgame: "complete" | "waiting" | "not_applicable";
}

const SEEDS: Seed[] = [
  { away: "CAR", home: "ARI", date: "2026-08-06", time: "20:00", week: HOF_WEEK, captured: false, postgame: "not_applicable" },
  { away: "ARI", home: "LV", date: "2026-08-13", time: "22:00", week: PRE_1, captured: true, postgame: "waiting" },
  { away: "BUF", home: "NYG", date: "2026-08-13", time: "23:00", week: PRE_1, captured: true, level1Gap: true, postgame: "complete" },
  { away: "CHI", home: "MIA", date: "2026-08-13", time: "23:00", week: PRE_1, captured: true, level1Gap: true, postgame: "waiting" },
  { away: "CIN", home: "PHI", date: "2026-08-14", time: "23:00", week: PRE_1, captured: true, level1Gap: true, postgame: "waiting" },
  { away: "CLE", home: "GB", date: "2026-08-14", time: "23:00", week: PRE_1, captured: true, level1Gap: true, postgame: "waiting" },
  { away: "DEN", home: "SF", date: "2026-08-14", time: "23:30", week: PRE_1, captured: true, level1Gap: true, postgame: "waiting" },
  { away: "DET", home: "ATL", date: "2026-08-14", time: "23:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "HOU", home: "MIN", date: "2026-08-14", time: "23:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "IND", home: "BAL", date: "2026-08-15", time: "17:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "JAX", home: "PIT", date: "2026-08-15", time: "17:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "KC", home: "NO", date: "2026-08-15", time: "20:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "LAC", home: "NE", date: "2026-08-15", time: "20:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "LAR", home: "TEN", date: "2026-08-15", time: "21:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "NYJ", home: "WAS", date: "2026-08-15", time: "23:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "TB", home: "CAR", date: "2026-08-15", time: "23:00", week: PRE_1, captured: false, postgame: "not_applicable" },
  { away: "DAL", home: "SEA", date: "2026-08-15", time: "23:00", week: PRE_1, captured: true, level1Gap: true, postgame: "complete" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function kickoffLabel(date: string, time: string): string {
  const [, m, d] = date.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, 2026 · ${time} UTC`;
}

/** "Thursday, August 13" */
function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${FULL_MONTHS[m - 1]} ${d}`;
}

/** "Thu Aug 13" */
function shortDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3);
  return `${weekday} ${MONTHS[m - 1]} ${d}`;
}


function dailyLoadStages(matchup: string): StageEvidence[] {
  return [
    {
      key: "schedule",
      name: "Schedule",
      status: "complete",
      attention: "none",
      count: 1,
      reason: "Game found in the loaded schedule table.",
      canonical_source: "nfl_schedule",
      timestamp: "2026-08-12T09:04:11Z",
      raw: { table: "nfl_schedule", row_count: 1, load_status: "OK" },
    },
    {
      key: "final_score_stats",
      name: "Final Score and Stats",
      status: "complete",
      attention: "none",
      count: 1,
      reason: "Final box score loaded after the game concluded.",
      canonical_source: "nfl_game_results",
      timestamp: "2026-08-16T06:12:40Z",
      raw: { table: "nfl_game_results", row_count: 1, load_status: "OK" },
    },
    {
      key: "facts",
      name: "Facts",
      status: "complete",
      attention: "none",
      count: 142,
      reason: "Fact rows derived for both teams.",
      canonical_source: "nfl_game_facts",
      timestamp: "2026-08-16T06:31:02Z",
      raw: { table: "nfl_game_facts", row_count: 142, load_status: "OK" },
    },
    {
      key: "windowed_metrics",
      name: "Windowed Metrics",
      status: "complete",
      attention: "none",
      count: 64,
      reason: "Rolling windows recomputed through this game date.",
      canonical_source: "nfl_windowed_metrics",
      timestamp: "2026-08-16T06:44:19Z",
      raw: { table: "nfl_windowed_metrics", row_count: 64, load_status: "OK" },
    },
    {
      key: "rankings",
      name: "Rankings",
      status: "complete",
      attention: "none",
      count: 32,
      reason: `League rankings refreshed for the ${matchup} date.`,
      canonical_source: "nfl_rankings",
      timestamp: "2026-08-16T06:52:58Z",
      raw: { table: "nfl_rankings", row_count: 32, load_status: "OK" },
    },
  ];
}

function pregameStages(seed: Seed, captureId?: string): StageEvidence[] {
  if (!seed.captured) {
    const missing: StageEvidence = {
      key: "snapshot",
      name: "Snapshot",
      status: "warning",
      attention: "known_gap",
      count: 0,
      reason: "Snapshot was not captured before kickoff.",
      canonical_source: "gamelens_pregame_snapshot",
      retryable: false,
      note: "Pregame evidence is only truthful if it was frozen before kickoff. This gap is permanent and is kept for audit.",
      raw: { table: "gamelens_pregame_snapshot", row_count: 0, capture_id: null, retryable: false },
    };
    return [
      missing,
      {
        key: "frozen_context",
        name: "Frozen Context",
        status: "not_applicable",
        attention: "none",
        count: 0,
        reason: "No canonical snapshot exists, so there is nothing to freeze.",
        canonical_source: "gamelens_frozen_context",
        raw: { table: "gamelens_frozen_context", row_count: 0, blocked_by: "snapshot" },
      },
      {
        key: "level_1",
        name: "Level 1",
        status: "not_applicable",
        attention: "none",
        count: 0,
        reason: "Level 1 depends on frozen pregame context.",
        canonical_source: "gamelens_level1_receipt",
        raw: { table: "gamelens_level1_receipt", row_count: 0, blocked_by: "snapshot" },
      },
    ];
  }

  return [
    {
      key: "snapshot",
      name: "Snapshot",
      status: "complete",
      attention: "none",
      count: 1,
      reason: "Snapshot frozen before kickoff.",
      canonical_source: "gamelens_pregame_snapshot",
      timestamp: "2026-08-15T23:42:07Z",
      raw: { table: "gamelens_pregame_snapshot", row_count: 1, capture_id: captureId ?? null },
    },
    {
      key: "frozen_context",
      name: "Frozen Context",
      status: "complete",
      attention: "none",
      count: 1,
      reason: "Context frozen from the canonical snapshot.",
      canonical_source: "gamelens_frozen_context",
      timestamp: "2026-08-15T23:43:15Z",
      raw: { table: "gamelens_frozen_context", row_count: 1, capture_id: captureId ?? null },
    },
    seed.level1Gap
      ? {
          key: "level_1",
          name: "Level 1",
          status: "warning",
          attention: "known_gap",
          count: 0,
          reason: "Level 1 receipt missing after kickoff.",
          canonical_source: "gamelens_level1_receipt",
          retryable: false,
          note: "Level 1 is only valid when written before kickoff. The window has closed, so this stays recorded as a historical gap.",
          raw: { table: "gamelens_level1_receipt", row_count: 0, retryable: false },
        }
      : {
          key: "level_1",
          name: "Level 1",
          status: "complete",
          attention: "none",
          count: 1,
          reason: "Level 1 receipt written before kickoff.",
          canonical_source: "gamelens_level1_receipt",
          timestamp: "2026-08-13T21:50:33Z",
          raw: { table: "gamelens_level1_receipt", row_count: 1 },
        },
  ];
}

function postgameStages(seed: Seed, learningRunId: string): StageEvidence[] {
  const level4: StageEvidence = {
    key: "level_4",
    name: "Level 4",
    status: "not_applicable",
    attention: "none",
    reason: "Not implemented yet.",
    note: "Level 4 will eventually represent weekly learning across games rather than a per-game worker.",
    canonical_source: "—",
    raw: { implemented: false },
  };

  if (seed.postgame === "not_applicable") {
    const blocked = (key: string, name: string): StageEvidence => ({
      key,
      name,
      status: "not_applicable",
      attention: "none",
      count: 0,
      reason: "No canonical pregame snapshot, so postgame learning cannot be graded.",
      canonical_source: `gamelens_${key}`,
      raw: { table: `gamelens_${key}`, row_count: 0, blocked_by: "snapshot", learning_run_id: learningRunId },
    });
    return [blocked("game_grade", "Game Grade"), blocked("level_2", "Level 2"), blocked("level_3", "Level 3"), level4];
  }

  if (seed.postgame === "waiting") {
    const waiting = (key: string, name: string): StageEvidence => ({
      key,
      name,
      status: "waiting",
      attention: "none",
      count: 0,
      reason: "Queued for the next postgame learning coordinator run.",
      canonical_source: `gamelens_${key}`,
      retryable: true,
      raw: { table: `gamelens_${key}`, row_count: 0, learning_run_id: learningRunId },
    });
    return [waiting("game_grade", "Game Grade"), waiting("level_2", "Level 2"), waiting("level_3", "Level 3"), level4];
  }

  const done = (key: string, name: string, count: number, ts: string): StageEvidence => ({
    key,
    name,
    status: "complete",
    attention: "none",
    count,
    reason: "Completed in the postgame learning run.",
    canonical_source: `gamelens_${key}`,
    timestamp: ts,
    raw: { table: `gamelens_${key}`, row_count: count, learning_run_id: learningRunId },
  });
  return [
    done("game_grade", "Game Grade", 1, "2026-08-18T17:41:22Z"),
    done("level_2", "Level 2", 12, "2026-08-18T17:48:05Z"),
    done("level_3", "Level 3", 4, "2026-08-18T17:56:12Z"),
    level4,
  ];
}

function rollup(stages: StageEvidence[]): StateCell {
  const attention: Attention = stages.some((s) => s.attention === "action_required")
    ? "action_required"
    : stages.some((s) => s.attention === "known_gap")
      ? "known_gap"
      : "none";

  const statuses = new Set(stages.map((s) => s.status));
  if (statuses.has("failed")) return { status: "failed", attention };
  if (attention === "known_gap") {
    const alsoProgressed = stages.some((s) => s.status === "complete");
    return { status: "warning", attention, mixed: alsoProgressed };
  }
  if (statuses.has("waiting")) return { status: "waiting", attention };
  if (statuses.size === 1 && statuses.has("not_applicable")) return { status: "not_applicable", attention };
  if (statuses.has("not_applicable") && statuses.has("complete")) {
    return { status: "complete", attention, mixed: true };
  }
  return { status: "complete", attention };
}

function overallRollup(cells: StateCell[]): StateCell {
  const attention: Attention = cells.some((c) => c.attention === "action_required")
    ? "action_required"
    : cells.some((c) => c.attention === "known_gap")
      ? "known_gap"
      : "none";
  if (cells.some((c) => c.status === "failed")) return { status: "failed", attention };
  if (attention !== "none") return { status: "warning", attention };
  if (cells.some((c) => c.status === "waiting")) return { status: "waiting", attention };
  return { status: "complete", attention };
}

function buildDetail(seed: Seed, learningRunId: string): GameDetail {
  const matchup = `${seed.away} @ ${seed.home}`;
  const gameId = `${seed.date.replace(/-/g, "")}_${seed.away}@${seed.home}`;
  const captureId = seed.captured ? `cap_${gameId.toLowerCase()}` : undefined;

  const clocks: ClockEvidence[] = [
    {
      key: "daily_data_load",
      name: "Daily Data Load",
      description: "Confirms the regular NFL data pipeline loaded this game. Separate from frozen GameLens evidence.",
      ...rollup(dailyLoadStages(matchup)),
      stages: dailyLoadStages(matchup),
    },
    {
      key: "gamelens_pregame",
      name: "GameLens Pregame",
      description: "What was genuinely preserved before kickoff. Pregame evidence cannot be reconstructed afterwards.",
      ...rollup(pregameStages(seed, captureId)),
      stages: pregameStages(seed, captureId),
    },
    {
      key: "postgame_learning",
      name: "Postgame Learning",
      description: "Grading and learning levels produced after the game concluded.",
      ...rollup(postgameStages(seed, learningRunId)),
      stages: postgameStages(seed, learningRunId),
    },
  ];

  const [daily, pregame, postgame] = clocks;
  const firstIssueStage = clocks
    .flatMap((c) => c.stages)
    .find((s) => s.attention !== "none" || s.status === "failed");

  return {
    game_id: gameId,
    matchup,
    away: seed.away,
    home: seed.home,
    kickoff_utc: `${seed.date}T${seed.time}:00Z`,
    kickoff_label: kickoffLabel(seed.date, seed.time),
    kickoff_time_label: `${seed.time} UTC`,
    game_date: seed.date,
    day_label: dayLabel(seed.date),
    game_week: seed.week,
    week_label: WEEK_LABELS[seed.week],
    game_status: "Final",
    overall: overallRollup([
      { status: daily.status, attention: daily.attention },
      { status: pregame.status, attention: pregame.attention },
      { status: postgame.status, attention: postgame.attention },
    ]),
    daily_data_load: { status: daily.status, attention: daily.attention, mixed: daily.mixed },
    gamelens_pregame: { status: pregame.status, attention: pregame.attention, mixed: pregame.mixed },
    postgame_learning: { status: postgame.status, attention: postgame.attention, mixed: postgame.mixed },
    first_issue: firstIssueStage?.reason,
    capture_id: captureId,
    learning_run_id: learningRunId,
    clocks,
  };
}

function toRow(detail: GameDetail): GameRow {
  const { clocks: _clocks, ...row } = detail;
  return row;
}

const RECENT_RUNS: RunAttempt[] = [
  {
    attempt_id: "att_20260815_2342_snapshot",
    label: "Snapshot capture · Aug 15, 2026 · 23:42 UTC",
    stage: "gamelens_pregame_snapshot",
    status: "complete",
    attention: "none",
    games_in_scope: 8,
    games_completed: 3,
    reason: "Coordinator ran after several kickoffs had already passed.",
    source_receipt_table: "gamelens_capture_receipt",
    started_at: "2026-08-15T23:42:07Z",
    finished_at: "2026-08-15T23:44:51Z",
    duration_seconds: 164,
    input_count: 8,
    output_count: 3,
    raw_reason: "PARTIAL_SCOPE: 5 games past kickoff_utc at invocation time",
  },
  {
    attempt_id: "att_20260818_1756_learning",
    label: "Postgame learning · Aug 18, 2026 · 17:56 UTC",
    stage: "gamelens_postgame_learning",
    status: "complete",
    attention: "none",
    games_in_scope: 7,
    games_completed: 2,
    reason: "Only games with a canonical pregame snapshot are eligible for grading.",
    source_receipt_table: "gamelens_learning_receipt",
    started_at: "2026-08-18T17:41:02Z",
    finished_at: "2026-08-18T17:56:44Z",
    duration_seconds: 942,
    input_count: 7,
    output_count: 2,
    raw_reason: "ELIGIBLE=2 SKIPPED=5 reason=missing_canonical_snapshot",
  },
  {
    attempt_id: "att_20260816_0652_daily",
    label: "Daily data load · Aug 16, 2026 · 06:52 UTC",
    stage: "nfl_daily_load",
    status: "complete",
    attention: "none",
    games_in_scope: 17,
    games_completed: 17,
    source_receipt_table: "nfl_load_receipt",
    started_at: "2026-08-16T06:04:11Z",
    finished_at: "2026-08-16T06:52:58Z",
    duration_seconds: 2927,
    input_count: 17,
    output_count: 17,
  },
];

// ---------- Adapter ----------

const CLOCK_LABEL: Record<ClockKey, string> = {
  daily_data_load: "Daily Data Load",
  gamelens_pregame: "GameLens Pregame",
  postgame_learning: "Postgame Learning",
};

function buildAttention(details: GameDetail[]): { needs_attention: AttentionItem[]; known_gaps: AttentionItem[] } {
  const needs_attention: AttentionItem[] = [];
  const known_gaps: AttentionItem[] = [];

  for (const game of details) {
    for (const clock of game.clocks) {
      for (const stage of clock.stages) {
        if (stage.attention === "none") continue;
        const item: AttentionItem = {
          id: `${game.game_id}:${clock.key}:${stage.key}`,
          game_id: game.game_id,
          matchup: game.matchup,
          week_label: game.week_label,
          game_date: game.game_date,
          day_label: game.day_label,
          clock: CLOCK_LABEL[clock.key],
          stage: stage.name,
          status: stage.status,
          attention: stage.attention,
          reason: stage.reason ?? "",
        };
        if (stage.attention === "action_required") needs_attention.push(item);
        else known_gaps.push(item);
      }
    }
  }
  return { needs_attention, known_gaps };
}

function buildWeeks(details: GameDetail[]): WeekSummary[] {
  const order = [HOF_WEEK, PRE_1];
  const dates: Record<string, string> = {
    [HOF_WEEK]: "August 6, 2026",
    [PRE_1]: "August 13–15, 2026",
  };
  return order.map((week) => {
    const games = details.filter((g) => g.game_week === week);
    const { needs_attention, known_gaps } = buildAttention(games);
    return {
      game_week: week,
      label: WEEK_LABELS[week],
      date_label: dates[week],
      scheduled: games.length,
      captured: games.filter((g) => Boolean(g.capture_id)).length,
      needs_attention: needs_attention.length,
      known_gaps: known_gaps.length,
    };
  });
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Day summaries are derived from the same canonical game rows — no component
 * ever reclassifies a backend status.
 */
function buildDays(details: GameDetail[]): DaySummary[] {
  const dates = Array.from(new Set(details.map((g) => g.game_date))).sort();

  return dates.map((date) => {
    const games = details.filter((g) => g.game_date === date);
    const { needs_attention, known_gaps } = buildAttention(games);
    const captured = games.filter((g) => Boolean(g.capture_id)).length;

    const parts = [plural(games.length, "game"), `${captured} captured`];
    if (needs_attention.length > 0) parts.push(`${needs_attention.length} needs attention`);
    if (known_gaps.length > 0) parts.push(plural(known_gaps.length, "known gap"));

    return {
      game_date: date,
      label: dayLabel(date),
      short_label: shortDayLabel(date),
      game_week: games[0].game_week,
      week_label: games[0].week_label,
      scheduled: games.length,
      captured,
      needs_attention: needs_attention.length,
      known_gaps: known_gaps.length,
      overall: overallRollup(games.map((g) => g.overall)),
      summary: parts.join(" · "),
    };
  });
}



/**
 * Single replaceable data source.
 *
 * Future implementation:
 *   const res = await authedFetch(`/admin/gamelens/run-visibility?${qs(toApiParams(filters))}`)
 *
 * Passing `gameId` is what returns `selected_game` with full stage evidence —
 * the overview payload only carries compact rows.
 */
export async function getRunVisibility(filters: RunVisibilityFilters): Promise<RunVisibilityResponse> {
  await new Promise((resolve) => setTimeout(resolve, filters.gameId ? 120 : 220));

  const learningRunId = filters.learningRunId || DEFAULT_LEARNING_RUN_ID;
  const allDetails = SEEDS.map((seed) => buildDetail(seed, learningRunId));

  const inRange = filters.gameWeek
    ? allDetails.filter((g) => g.game_week === filters.gameWeek)
    : allDetails;

  const { needs_attention, known_gaps } = buildAttention(inRange);
  const rows = inRange.map(toRow);
  const selected = filters.gameId ? (allDetails.find((g) => g.game_id === filters.gameId) ?? null) : null;

  return {
    generated_at: GENERATED_AT,
    environment: "development",
    read_only: true,
    params_echo: toApiParams(filters),
    overview: {
      source_tables_available: 6,
      source_tables_total: 6,
      scheduled_games: rows.length,
      canonical_captures: inRange.filter((g) => Boolean(g.capture_id)).length,
      needs_attention: needs_attention.length,
      known_gaps: known_gaps.length,
      weeks: buildWeeks(allDetails),
      games: rows,
    },
    attention: { needs_attention, known_gaps },
    recent_runs: RECENT_RUNS,
    games: rows,
    selected_game: selected,
  };
}
