# Pre-release inspection: removing Run Visibility + light polish

Read-only inspection at checkpoint `4290b715`. Nothing was edited, published, or reverted.

## 1. Everything that belongs to Run Visibility

Navigation / entry points
- `src/components/AppShell.tsx` line 5 (`Activity` icon import), lines 30-36: the "Run Visibility" desktop nav item, shown only when the signed-in account is an admin. It is not in the mobile tab row (that uses `baseNavItems` only).
- No other page links to it; no button, card, or deep link elsewhere points at `/admin/run-visibility`.

Route
- `src/App.tsx` line 22 (lazy import) and line 87 (`/admin/run-visibility` inside `ProtectedRoute`).

Page and components (used by nothing else)
- `src/pages/AdminRunVisibility.tsx` (398 lines)
- `src/components/run-visibility/`: `OverviewCards`, `WeekCards`, `DaySummaryList`, `GameJourneyTable`, `AttentionSummary`, `RecentRuns`, `GameDetailDrawer`, `StageTimeline`, `JourneyTicks`, `StatusChip` — all imported only by `AdminRunVisibility.tsx` or by each other.

Hooks / data layer / API
- `src/hooks/useRunVisibility.ts` — `useRunVisibility`, `useRunVisibilityDay`, `useRunVisibilityGame`.
- `src/lib/run-visibility.ts` (types, filters, derivation), `src/lib/run-visibility-api.ts`, `src/lib/run-visibility.fixture.ts`.
- API call: `GET /admin/gamelens/run-visibility` on its own host `https://nfl-games-app-dev-ids7lwjjta-uc.a.run.app` (a different host from the main `API_BASE`), Firebase bearer token, non-persisted React Query.

## 2. Impact on the rest of the app

None. Slate, game details, Matchup Lens, Settings, Admin claim health and authentication do not import any Run Visibility module. The only shared things it touches are read-only consumers: `AppShell`, `ProtectedRoute`, `useMe` from `src/lib/admin-api.ts`, `getAuthToken` from `src/lib/firebase.ts`, and shadcn UI primitives. Its API host is used by nothing else, so dropping it removes one outbound host from the frontend.

## 3. Smallest safe frontend-only removal (required)

1. `src/components/AppShell.tsx` — delete the "Run Visibility" nav entry and the now-unused `Activity` icon import. The "Admin" (claim health) entry stays.
2. `src/App.tsx` — delete the lazy import and the `/admin/run-visibility` route.
3. Delete the isolated code: `src/pages/AdminRunVisibility.tsx`, the whole `src/components/run-visibility/` folder, `src/hooks/useRunVisibility.ts`, `src/lib/run-visibility.ts`, `src/lib/run-visibility-api.ts`, `src/lib/run-visibility.fixture.ts`.
4. Delete the two dedicated test files (see item 6).
5. Backend routes, tables, jobs and data: untouched. No configuration change, no `API_BASE` change.

Option B, if you would rather keep the code for later: do only steps 1 and 2 and keep the files. They would then be dead code the build still typechecks; the tests keep passing unchanged. Slightly larger repo, zero risk, fully reversible.

## 4. Shared components that must not be deleted

`src/components/AppShell.tsx`, `src/components/ProtectedRoute.tsx`, `src/lib/admin-api.ts` (used by AppShell, ProtectedRoute and claim health), `src/lib/firebase.ts`, `src/lib/utils.ts`, and everything under `src/components/ui/` (card, sheet, collapsible, skeleton, etc. are used app-wide). `src/pages/AdminClaimHealth.tsx` is a separate admin page and is not part of this removal.

## 5. Exact frontend files that would change

Edited: `src/App.tsx`, `src/components/AppShell.tsx`.
Deleted (full removal path): `src/pages/AdminRunVisibility.tsx`, `src/components/run-visibility/*` (10 files), `src/hooks/useRunVisibility.ts`, `src/lib/run-visibility.ts`, `src/lib/run-visibility-api.ts`, `src/lib/run-visibility.fixture.ts`, `src/test/run-visibility-page.test.tsx`, `src/lib/run-visibility.test.ts`.

## 6. Tests

- `src/test/run-visibility-page.test.tsx` and `src/lib/run-visibility.test.ts` cover only Run Visibility; they are deleted with it.
- No other test imports these modules. Matchup Lens tests only mock `admin-api`'s `useMe`, which stays. Expected suite after removal: the current 177 minus the cases in those two files, all remaining files unchanged.

## 7. Direct URLs, redirects, stale links

Today `src/App.tsx` has no catch-all route, so any unknown path renders an empty themed screen — `src/pages/NotFound.tsx` exists but is not wired up. After removal, an old `/admin/run-visibility` bookmark would hit that blank screen. Recommended minimal handling: add a catch-all route that redirects to `/`. That is a one-line addition and also fixes every other mistyped URL. No server redirect is needed; nothing external links to the page.

## 8. Current major screens and visual hierarchy

- Login — single centered sign-in card.
- Games (`/`) — page title and date control, then a vertical list of matchup cards; entry point to everything.
- Game detail (`/matchup/:id`) — header with the two teams, then stacked analysis sections including Team Comparison.
- Matchup Lens (`/matchup-lens`) — sticky context bar, ticker, destination cards, then a focused view driven by the URL; readiness and suppression notices appear inline.
- Settings — short titled page with a few grouped rows.
- Admin claim health — admin-only table view.
- Run Visibility — admin-only operational dashboard: five count cards, week cards, day list, game table, attention list, recent runs, detail drawer. This is the densest screen in the product and the one being removed.

## 9. Optional visual polish (five or fewer, no redesign)

1. Consistent page headers: same title size, spacing and one-line subtitle on Games, Matchup Lens and Settings, so each screen opens the same calm way.
2. Softer card surfaces: one shared border/rounding/shadow treatment across matchup cards and lens cards; remove competing emphasis.
3. Quieter numbers: reserve the accent colour for the single most important figure per card and let supporting figures sit in muted text.
4. Warmer empty and loading states: short, human one-liners instead of neutral system phrasing, with the existing retry action kept as is.
5. A small personal touch in the header: greet by first name instead of showing the full email address.

## Summary of recommendations

Required to remove Run Visibility: items in section 3 (nav entry, route, isolated files, its two test files) plus the catch-all redirect from section 7.

Optional visual polish: the five items in section 9, each independent and separately approvable.

Do not touch: Matchup Lens behaviour, scoring, the live lens contract, `API_BASE`, Firebase auth, `ProtectedRoute`, `admin-api.ts`, claim health, shadcn UI primitives, and all backend routes, tables and jobs.

No implementation has been done. Awaiting your decisions on which parts to proceed with.
