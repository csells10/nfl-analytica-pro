# Diagnosis: adapter vs. authenticated DET/BUF production response

Read-only. The captured payload was run through the current production adapter path (`adaptMatchupLensV1`) exactly as the page calls it. Nothing was edited, published, or added to source control.

## Result

`adaptMatchupLensV1()` **rejects** the payload.

- First rejection: `metric_catalog[0] must be an object`
- Expected (current code): `{ metric, label, signal_strength, lens_tags }`
- Actual (production): `"1st_down_rate"` — `metric_catalog` is a flat array of 63 metric-name strings

Responsible code: `src/lib/matchup-lens-adapter.ts` → `adaptCatalog()` → the `if (!isRecord(entry)) fail(...)` branch, reached from `adaptMatchupLensV1()`.

Failure layer: **adapter validation**. Response parsing is fine (HTTP 200, valid JSON, correct `schema_version` / `available` / `reason`). Query handling is fine (request reached the right URL, single game key). Post-adapter rendering is fine — the safe unreadable-response state is exactly the contracted behaviour when the adapter throws.

## Additional mismatches (diagnostic-only continuation)

The validator stops at the first error, so the remaining ones were found by inspecting the payload directly. All are shape mismatches between our assumed envelope and the real one — the payload itself is internally consistent.

1. **Team evidence location** — production nests both sides under `teams.away` / `teams.home`. The adapter reads top-level `payload.away` / `payload.home`, which are absent.
2. **Metric metadata location** — `label`, `signal_strength`, `lens_tags` live on each team metric entry, not in the catalog. Away/home agree on all shared metrics (0 conflicts), so a union of team entries is a safe definition source. Counts: 10 strong, 37 supporting, 16 context.
3. **Team header** — `away_team`/`home_team` carry `team_id`, `team_abv`, `logo_url`; there is no `team_name`.
4. **Basis** — `window_type` (not `window`), `source_data_dates` (array, not `source_data_date`), plus `max_data_lag_days`, `pregame_safe`, `comparison_not_forecast`, `rankings_source`, `window_source`. No top-level `latest_included_game`; each team carries `latest_included_game_id`.
5. **Readiness rows** — six rows, frozen order confirmed (`explosiveness`, `drive-control`, `scoring-finish`, `defensive-resistance`, `disruption-protection`, `turnover-balance`). Fields are `display_name` (not `lens_name`) and `comparison_status` (not `status`); each side has `catalog_eligible_metric_count` / `eligible_numeric_metric_count` / `missing_metrics`. DET Drive Control `partial` missing `fourth_down_pct`, BUF `complete`.
6. **Warnings** — live under `coverage.warnings` (3 entries: asymmetric, league-rank-suppressed, partial), not top level. The adapter currently silently drops them (it tolerates an absent top-level `warnings`), so disclosure copy would be lost even after the other fixes.
7. **Coverage** — no `named_metric_coverage`; adds `missing_away_metrics` / `missing_home_metrics`. Counts confirmed 63 / 62 / 63 / 62.
8. **League context** — `mode: "suppressed"` plus `reason_code` and `message`; no `reason`, no `teams_in_payload`.
9. **Method** — matches the frozen contract exactly (`selection`, `frontend_role`, `forecast: false`). No `numerator` / `denominator` anywhere.
10. Percentiles are numeric, in 0–100, with no nulls on either side.

## Smallest proposed repair (not applied)

Realign the transport types and adapter reads to the real envelope, keeping every scoring formula, weight, tag rule and exclusion untouched:

- `metric_catalog: string[]`; build scoring `MetricDefinition`s from the union of team metric entries (`label`, `signal_strength`, `lens_tags`), still dropping `context` metrics from scoring while accepting them as transport.
- Read evidence from `teams.away` / `teams.home`; keep canonical-identity agreement with the game header.
- Keep cross-side agreement validation for shared metrics (label, signal strength, tags) — this replaces the current catalog-agreement check without weakening it.
- Basis: `window_type`, `source_data_dates[]`, `max_data_lag_days`; team-level `latest_included_game_id`.
- Readiness: `display_name`, `comparison_status`, side counts; keep the exactly-six-rows-in-frozen-order check.
- Warnings: read `coverage.warnings[].message`; `named_metric_coverage` optional.
- League context: `mode` plus `reason_code` / `message`; keep the suppression behaviour unchanged.
- Method: unchanged frozen-literal checks.

## Tests required

- Adapter: accepts a fixture matching the real envelope; produces 47 scoring definitions (16 context excluded); DET omits `fourth_down_pct` with no zero fill; identical lens scores to the current expected values; warnings surfaced from `coverage.warnings`; suppression flag set.
- Negative: non-string catalog entry, missing `teams`, team header mismatch, shared-metric definition conflict, wrong readiness order or count, wrong method literals, `forecast: true`, out-of-range or non-numeric percentile — each still rejected.
- Live page: DET/BUF fixture renders scored content, Drive Control partial notice names DET, league standings and ordinals hidden, no static/preseason path.
- Full suite, typecheck, build, then an authenticated DET/BUF reload for acceptance evidence.

Stopping here as instructed — no repair made.
