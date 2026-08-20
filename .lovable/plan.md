# GameLens Run Visibility — admin wireframe

A new protected admin page that traces every scheduled game through the GameLens pipeline, built entirely on static mock data behind a single swappable adapter.

## Route and shell

- New route `/admin/run-visibility`, lazy-loaded and wrapped in `ProtectedRoute`, matching how `/admin/claim-health` is registered.
- Rendered inside the existing `AppShell`, so nav, theme toggle and sign-out stay intact.
- Admin nav entry added next to the existing Admin link (visible only when `me.is_admin`).

## Data layer

One file, `src/lib/run-visibility.ts`:

- `RunVisibilityFilters` — season, seasonType, datePreset (`current_week` | `recent_18_days` | `custom` | `season_to_date`), custom range, week key.
- `getRunVisibility(filters): Promise<RunVisibilityResponse>` — the single replaceable call. Returns the mock payload shaped exactly like the future `GET /admin/gamelens/run-visibility`: `overview`, `overview.weeks`, `overview.games`, `attention.needs_attention`, `attention.known_gaps`, `recent_runs`, `games`, `selected_game`.
- Mock rows live in one `MOCK_RUN_VISIBILITY` constant in that file; no mock data in components.
- `season_to_date` is isolated: the preset is flagged `unsupportedByBackend: true`, and the UI shows a small note that the protected endpoint currently accepts a 31-day maximum range. No pretending it works.
- Consumed through a `useRunVisibility(filters)` React Query hook so swapping in `fetch` later changes nothing above it.

## Page structure

1. **Header** — title, subtitle, "Development / Read Only" badge, last-refreshed timestamp.
2. **Filter bar** — season, season type, date-preset (4 presets incl. Custom Range inputs), week selector with "All visible weeks".
3. **Overview cards (5)** — Source Tables 6 of 6, Scheduled Games 17, Canonical Captures 7, Needs Attention 0, Known Gaps 16. Needs Attention uses alert styling only when > 0; Known Gaps uses a calm amber/neutral treatment.
4. **Week cards** — Hall of Fame Weekend and Preseason Week 1 with date, scheduled/captured/attention/gap counts. Selecting one filters the table; selection is reflected in the week selector.
5. **Attention sections** — two collapsibles: Needs Attention (open when count > 0, shows game/clock/stage/status/reason) and Known Gaps (collapsed, explanatory copy, rows open the game drawer).
6. **Game journey table** — one row per game: matchup (+ game ID), kickoff, overall state, Daily Data Load, GameLens Pregame, Postgame Learning, first issue, Details. Horizontally scrollable on narrow screens; on phones rows collapse to stacked cards with the three clock chips.
7. **Recent Runs** — collapsed section with friendly labels ("Snapshot capture · Aug 15, 2026 · 23:42 UTC"), status, games in scope, completed, reason. Expanding a row reveals raw attempt ID, stage, receipt table, start/finish, duration, input/output counts, raw reason, plus a one-line note that an attempt is a coordinator invocation, not a game.

## Status chips

Single `StatusChip` component with icon + text + token-based color, never color alone: Complete (green/check), No Work Needed (teal/check), Waiting (blue/clock), Not Applicable (gray/minus), Known Gap (amber/history), Needs Attention (red/alert), Failed (red/x-circle). All colors from existing semantic tokens (`success`, `primary`, `muted`, `level-*`, `destructive`).

## Game detail

- Desktop: right-side drawer (`Sheet`). Mobile: full-screen panel (same component, `side="bottom"` / full height).
- Header: matchup, game ID, week, scheduled kickoff, game status, overall state, capture ID when present, learning run ID.
- Three vertical timeline "clocks":
  - Daily Data Load — Schedule, Final Score and Stats, Facts, Windowed Metrics, Rankings.
  - GameLens Pregame — Snapshot, Frozen Context, Level 1. Copy makes clear a missed pregame snapshot is permanent.
  - Postgame Learning — Game Grade, Level 2, Level 3, Level 4. Level 4 always Not Applicable with the "weekly learning, not a per-game worker" explanation.
- Selecting a stage expands: friendly name, status, count, human-readable reason, canonical source, timestamp, retryable state, extra evidence. Technical field names sit in a secondary collapsed "Raw evidence" block.
- Cascade rule encoded in the mock data: a downstream stage blocked by a missing canonical pregame snapshot is Not Applicable, not a second active failure — one root cause, one alert.

## Explicitly out of scope

No API/Supabase/auth wiring, no write, retry, backfill or reconstruct actions, no Level 4 behavior, no changes to `/game` or any public page, no decorative charts.

## Files

- `src/pages/AdminRunVisibility.tsx` (page composition)
- `src/lib/run-visibility.ts` (types + `getRunVisibility` + mock payload)
- `src/hooks/useRunVisibility.ts`
- `src/components/run-visibility/` — `StatusChip.tsx`, `OverviewCards.tsx`, `WeekCards.tsx`, `GameJourneyTable.tsx`, `AttentionSections.tsx`, `RecentRuns.tsx`, `GameDetailDrawer.tsx`, `StageTimeline.tsx`
- Edits: `src/App.tsx` (route), `src/components/AppShell.tsx` (nav item)
