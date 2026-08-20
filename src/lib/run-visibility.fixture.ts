/**
 * Test-only fixture shaped exactly like a successful
 * GET /admin/gamelens/run-visibility response.
 *
 * This file is never imported by application code — the adapter has no mock
 * fallback. It exists so normalization can be asserted against a realistic
 * backend payload.
 */

export const RUN_VISIBILITY_FIXTURE = {
  available: true,
  access_mode: "read_only",
  scope: "development",
  source_profile: "gamelens_dev",
  generated_at: "2026-08-20T18:05:00Z",
  filters: {
    season: "2026",
    season_type: "Preseason",
    learning_run_id: "gamelens_2026_preseason_v1",
    start_date: "2026-08-03",
    end_date: "2026-08-20",
  },
  navigation: {
    default_level: "day",
    levels: ["range", "week", "day", "game"],
    default_expanded: false,
    selected_game_week: null,
    selected_game_id: null,
  },
  overview: {
    source_health: { available: 6, total: 6 },
    weeks: [
      {
        game_week: "preseason_week_1",
        label: "Preseason Week 1",
        date_label: "August 13–15, 2026",
        scheduled: 2,
        captured: 1,
        need_attention: 0,
        known_gaps: 1,
      },
    ],
    games: {
      scheduled: 2,
      captured: 1,
      need_attention: 0,
      known_gaps: 1,
      returned: 2,
      truncated: false,
    },
    recent_run_count: 1,
  },
  attention: {
    needs_attention: [],
    known_gaps: [
      {
        game_id: "20260813_BUF@NYG",
        matchup: "BUF @ NYG",
        game_date: "2026-08-13",
        game_week: "preseason_week_1",
        clock: "pregame",
        stage: "level_1",
        status: "warning",
        attention: "known_gap",
        reason: "Level 1 receipt missing after kickoff.",
      },
    ],
  },
  recent_runs: [
    {
      source: "gamelens_capture_receipt",
      display_label: "Snapshot capture · Aug 15, 2026 · 23:42 UTC",
      scope_label: "8 games in scope · 3 captured",
      attempt_id: "att_20260815_2342_snapshot",
      stage: "gamelens_pregame_snapshot",
      status: "complete",
      reason: "Coordinator ran after several kickoffs had already passed.",
      input_count: 8,
      output_count: 3,
      duration_ms: 164000,
      finished_at: "2026-08-15T23:44:51Z",
    },
  ],
  games: [
    {
      game_id: "20260813_ARI@LV",
      game_week: "preseason_week_1",
      matchup: "ARI @ LV",
      game_date: "2026-08-13",
      scheduled_kickoff: "2026-08-13T22:00:00Z",
      game_status: "Final",
      state: "complete",
      first_issue: null,
      detail_available: true,
      clocks: {
        data_load: {
          id: "data_load",
          label: "Daily Data Load",
          state: "complete",
          stages: [{ stage: "schedule", status: "complete", attention: "none", count: 1 }],
        },
        pregame: {
          id: "pregame",
          label: "GameLens Pregame",
          state: "complete",
          stages: [{ stage: "snapshot", status: "complete", attention: "none", count: 1 }],
        },
        postgame: {
          id: "postgame",
          label: "Postgame Learning",
          state: "waiting",
          stages: [{ stage: "game_grade", status: "waiting", attention: "none", count: 0 }],
        },
      },
    },
    {
      game_id: "20260813_BUF@NYG",
      game_week: "preseason_week_1",
      matchup: "BUF @ NYG",
      game_date: "2026-08-13",
      scheduled_kickoff: "2026-08-13T23:00:00Z",
      game_status: "Final",
      state: "known_gap",
      first_issue: "Level 1 receipt missing after kickoff.",
      detail_available: true,
      clocks: {
        data_load: {
          id: "data_load",
          label: "Daily Data Load",
          state: "complete",
          stages: [{ stage: "schedule", status: "complete", attention: "none", count: 1 }],
        },
        pregame: {
          id: "pregame",
          label: "GameLens Pregame",
          state: "known_gap",
          stages: [
            { stage: "snapshot", status: "warning", attention: "known_gap", count: 0 },
            { stage: "level_1", status: "warning", attention: "known_gap", count: 0 },
          ],
        },
        postgame: {
          id: "postgame",
          label: "Postgame Learning",
          state: "not_applicable",
          stages: [{ stage: "game_grade", status: "not_applicable", attention: "none", count: 0 }],
        },
      },
    },
  ],
  selected_game: null,
};

export const RUN_VISIBILITY_DETAIL_FIXTURE = {
  ...RUN_VISIBILITY_FIXTURE,
  selected_game: {
    game_id: "20260813_ARI@LV",
    game_week: "preseason_week_1",
    matchup: "ARI @ LV",
    game_date: "2026-08-13",
    scheduled_kickoff: "2026-08-13T22:00:00Z",
    game_status: "Final",
    state: "complete",
    season: "2026",
    season_type: "Preseason",
    detail_available: true,
    lineage: {
      learning_run_id: "gamelens_2026_preseason_v1",
      capture_id: "cap_20260813_ari_lv",
    },
    first_issue: null,
    traceability: { source_profile: "gamelens_dev" },
    clocks: {
      data_load: {
        id: "data_load",
        label: "Daily Data Load",
        state: "complete",
        stages: [
          {
            stage: "schedule",
            status: "complete",
            attention: "none",
            count: 1,
            reason: "Game found in the loaded schedule table.",
            source: "nfl_schedule",
            details: { table: "nfl_schedule", row_count: 1 },
          },
        ],
      },
      pregame: {
        id: "pregame",
        label: "GameLens Pregame",
        state: "complete",
        stages: [
          {
            stage: "snapshot",
            status: "complete",
            attention: "none",
            count: 1,
            reason: "Snapshot frozen before kickoff.",
            source: "gamelens_pregame_snapshot",
            details: { capture_id: "cap_20260813_ari_lv" },
          },
        ],
      },
      postgame: {
        id: "postgame",
        label: "Postgame Learning",
        state: "waiting",
        stages: [
          {
            stage: "game_grade",
            status: "waiting",
            attention: "none",
            count: 0,
            reason: "Queued for the next postgame learning coordinator run.",
            source: "gamelens_game_grade",
          },
        ],
      },
    },
  },
};
