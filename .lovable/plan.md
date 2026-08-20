# Run Visibility — real backend integration

Replace the mock adapter behind the existing Run Visibility page with the protected development endpoint, keeping the day-first design, drawer, and status treatments exactly as they are.

## Files inspected

- `src/lib/run-visibility.ts` — types, `toApiParams`, `resolveRange`, `buildDays`, mock `SEEDS`, `getRunVisibility`
- `src/lib/admin-api.ts` — the existing authenticated admin fetch pattern (`getAuthToken` → `Authorization: Bearer`, 401 sign-out, 403 forbidden, `useMe`)
- `src/lib/nfl-api.ts` — `API_BASE` (`https://nfl-games-app-main-...run.app`) and `ApiError`
- `src/hooks/useRunVisibility.ts`, `src/pages/AdminRunVisibility.tsx`, `src/components/run-visibility/*`
- `src/App.tsx` — global React Query defaults: `staleTime` 5 min, `gcTime` 24h, `PersistQueryClientProvider` with 24h `maxAge`
- `vitest.config.ts`, `src/test/`

Confirmed by these reads: no development service URL and no env/config mechanism for one exists anywhere in the repo (no `.env`, no `VITE_*` usage). `API_BASE` is a single hardcoded production constant shared by `/games`, `/game`, `/me`, and Claim Health.

## Blocking configuration value

The development base URL `https://nfl-games-app-dev-362530996210.us-central1.run.app` cannot be confirmed from the repository — it appears nowhere in code, config, or docs. It will be introduced as a new named constant used only by this adapter, and must be confirmed by you before the integration is trusted. No fallback to the production API base, and `API_BASE` is not touched.

Also needs confirmation: `season_type` casing. The UI holds lowercase (`preseason`), while the stated initial value is `Preseason`. The adapter will send the backend-facing casing (capitalized) via an explicit map so the UI type stays unchanged.

## Files that would change

| File | Change |
| --- | --- |
| `src/lib/run-visibility-api.ts` (new) | `RUN_VISIBILITY_API_BASE` dev constant, authenticated `fetch`, param serialization, error mapping |
| `src/lib/run-visibility.ts` | `getRunVisibility` calls the API; response normalizer + day derivation kept; mock moves out |
| `src/lib/run-visibility.fixture.ts` (new) | Existing `SEEDS`/builders moved here, test-only, never imported by app code |
| `src/hooks/useRunVisibility.ts` | Full query keys, ~45s `staleTime`, no persistence, no retry on auth errors |
| `src/pages/AdminRunVisibility.tsx` | Error/empty/truncated states, Refresh action, "Evidence generated" + "Loaded" timestamps, day selection re-query |
| `src/components/run-visibility/GameDetailDrawer.tsx` | Detail error state; overview untouched while detail loads |
| `src/components/run-visibility/RecentRuns.tsx` | Use `display_label` / `scope_label`; `attempt_id` stays in the drill-down |
| `src/lib/run-visibility.test.ts` (new) | Param, guard, header, error, truncation tests |

## Adapter

`getRunVisibility(filters)` stays the only data entry point.

- Builds `URLSearchParams` from `toApiParams`, omitting `game_week`, `game_id`, `limit` when blank.
- Required: `season`, `season_type`, `learning_run_id`, `start_date`, `end_date` (`YYYY-MM-DD`). Defaults: season `2026`, `Preseason`, `gamelens_2026_preseason_v1`, `limit=50`.
- Client guard rejects ranges over 31 inclusive days before any network call, surfacing a filter-level message instead of a 400.
- Token via the existing `getAuthToken()`; header `Authorization: Bearer <token>`. No new auth system, no token storage, no Supabase.
- On any failure it throws a typed error. No mock fallback — the fixture is imported only by tests.

Response normalization (adapter-internal, no component reclassifies status):

- `overview.source_health` → source-table card; `overview.games.{scheduled,captured,need_attention,known_gaps,returned,truncated}` → overview cards + truncation notice; `overview.weeks` → week cards and week selector.
- Compact `games[]` (`game_id`, `game_week`, `matchup`, `game_date`, `scheduled_kickoff`, `game_status`, `state`, `first_issue`, `clocks`, `detail_available`) map to the existing `GameRow`, with kickoff/day labels formatted in the adapter and the three clock states read from `clocks[]` for `JourneyTicks`.
- Day summaries continue to be derived by `buildDays` from `game_date`, capture state, overall state, and attention — the backend returns no day rollups.
- `selected_game` (with `lineage.learning_run_id`, `lineage.capture_id`, detailed `clocks[].stages[].{reason,source,details}`, `traceability`) maps to `GameDetail` for the drawer.
- `attention.needs_attention` / `attention.known_gaps` feed the existing summary banner and ledger.
- Unknown status/attention/state values render through a neutral fallback rather than throwing. `warning` stays a warning; it is not promoted to active attention.

## Three request shapes

1. **Overview** — bounded range from the preset, optional `game_week`, `limit=50`, no `game_id`.
2. **Day selection** — same endpoint with `start_date = end_date = selected day`, season/type/run/week preserved. Separate query key, so the range-level result stays cached.
3. **Game detail** — same endpoint plus `game_id`, scoped to the relevant day and week. Runs as its own query; the overview query is never invalidated or replaced while it loads.

Query keys include season, seasonType, learningRunId, startDate, endDate, gameWeek, gameId, limit. `staleTime` ~45s, `gcTime` short, and these keys are excluded from the 24h persister via `shouldDehydrateQuery` so operational data is never restored from storage. A read-only Refresh button re-fetches the visible queries.

Header shows `generated_at` as "Evidence generated" and a client timestamp as "Loaded".

## States

- **Loading**: existing skeletons for overview; day list keeps previous data via `keepPreviousData`; drawer has its own loading state.
- **Empty**: "No scheduled games in this range" card in place of the day list.
- **Truncated** (`overview.games.truncated`): calm inline notice "Result limit reached — narrow the date range or week", and derived day counts are labelled as partial. Nothing is silently hidden.
- **401 unauthorized**: existing expired-session/sign-in path from `admin-api`.
- **403 forbidden**: existing "Admin access required" panel; route stays protected for authenticated non-admins.
- **403 development_source_unavailable**: dedicated message that development Run Visibility is unavailable. No retry, never against production.
- **404 game_week_not_found**: clear the week selection, refetch the unfiltered bounded range, show a one-line note.
- **404 game_not_found**: close/reset the drawer, overview untouched.
- **400 invalid_run_visibility_request**: safe backend message rendered near the filters.
- **500 run_visibility_query_failed**: retryable read error, no exception detail exposed.

Season to Date stays disabled/Future — the endpoint caps at 31 inclusive days and no background range splitting will be added.

## Tests (`src/lib/run-visibility.test.ts`, mocked `fetch`)

Exact query-string serialization; blank optional params omitted; 31-day guard; `limit=50`; `Authorization` header present; distinct query keys for overview/day/game; `game_id` request populates `selected_game`; failures throw and never return mock data; each documented error code maps to its state; `truncated: true` surfaces the warning; non-admin is rejected at the route; and an assertion that `API_BASE` in `src/lib/nfl-api.ts` is unchanged and unused by the Run Visibility adapter.

## Preview without publishing

Work lands on a branch and is verified in the Lovable preview URL with an admin account. Nothing is published or merged, and no Firebase, CORS, Cloud Run, or backend change is part of this work. If the dev service rejects the preview origin via CORS, I will stop and report rather than adjust any infrastructure.

## Out of scope

Visual hierarchy changes, `API_BASE`, `/games`, `/game`, `/me`, Claim Health, BigQuery, Supabase, any write/retry/backfill action, Level 4, Packet 6, publishing or merging.
