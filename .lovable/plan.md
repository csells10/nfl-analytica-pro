# Pass 4 — Guides, route-aware Help, clearer states, seven-day lookup

Baseline: `5ec70e655849bea3afdde52a222a06640fdd16d0`. Frontend only. No backend, API base, auth, or retry changes. Nothing published.

## 1. Shared step-guide component

One small reusable dialog (`src/components/StepGuide.tsx`) used by both new guides: title, step body, step counter, Next / Finish, Close (X) and Skip, Escape to close, focus moved into the dialog and returned on close, animations suppressed under reduced motion. No remote state; each guide passes its own localStorage key.

## 2. Matchups first-visit guide

Four steps: choose a game date, choose a matchup, open game details, open or review in Matchup Lab.

- Key `gamelens.guide.matchups.v1`, opens once per browser.
- `hasSeenDateTutorial` is no longer read or written; no migration, so the new guide shows once for everyone.
- Old `DateSelectionModal` spotlight is retired from Slate.
- Help reopens it any time, including after completion.

## 3. Matchup Lab first-visit guide

Four steps: matchup / evidence window / current view context; Start here and Biggest Edge; the three choices (compare teams, explore the biggest edge, browse all six lenses); supporting evidence and how signal or metric controls open trace details.

- Key `gamelens.guide.matchup-lab.v1`.
- Auto-opens only once live evidence has actually rendered (adapted available context present) — never on loading, unavailable, or error states.
- Help reopens it while in Matchup Lab.
- Uses the current post-Pass-3C layout; no removed features return.

Game-detail guide and its existing key stay exactly as they are.

## 4. Route-aware Help

`gamelens:open-guide` stays the event, but now carries a guide id (`matchups`, `game-detail`, `matchup-lab`) derived in `AppShell` from the current route. Each page listens only for its own id, so one Help click opens exactly one guide. On routes with no guide (Settings, Admin, unknown), the Help button is hidden.

## 5. Seven-day schedule lookup

On a Matchups visit with no `?date=`:

- Fire today plus the next six days in parallel through the existing `useNflSchedule` / `["nfl-schedule", date]` query convention, reusing cache.
- While resolving: "Finding upcoming games…".
- Select the earliest successfully loaded date that has games; apply it through the existing date-selection handler (URL update included). Today wins if today has games.
- If all seven succeed with no games: keep today selected and show "No games found in the next seven days. Choose another date."
- Failed dates are ignored for selection and highlighting and are never described as "no games".

With `?date=` present: that date is respected and never auto-replaced; the scan still runs from that date for highlights only.

Calendar highlights: only dates with a successful response containing games get a modifier dot/emphasis. When the selected date is empty but another scanned date has games, one action appears — "View games on Sunday, September 20" — reusing the existing date-selection path.

No sequential probing, no window beyond seven days, no weekday guessing, no static schedule data.

## 6. Clearer states

- No date: "Choose a date to see scheduled matchups."
- Empty selected date: "No NFL games are scheduled for this date."
- Missing Lab game: "Choose a game to open Matchup Lab" with a "View Matchups" action.
- Unavailable Lab evidence: "Matchup Lab isn't ready for this game yet", keeping the controlled backend reason when present, existing Try Again, plus "View Matchups".
- Retryable Lab failure: "Matchup Lab didn't load", same retry callback.

Real errors stay visible; raw backend bodies still never render.

## Technical notes

Files expected to change: `src/components/AppShell.tsx`, `src/pages/Slate.tsx`, `src/pages/MatchupLens.tsx`, `src/pages/Matchup.tsx` (event id only), `src/components/matchup-lens/DashboardStates.tsx`, new `src/components/StepGuide.tsx`, new `src/lib/guides.ts` (ids, keys, open helper), new `src/lib/use-schedule-scan.ts`. `DateSelectionModal.tsx` removed from use.

## Verification

New/updated tests covering: each guide auto-opens once for its own versioned key; Help opens the correct route's guide; Matchups and Lab guides never open together; game-detail guide unchanged; normal visit selects the earliest date with games in the window; a URL date is never auto-replaced; highlights come only from successful responses; a failed date is not treated as empty; retry actions still work; Collision and Technical Map remain absent.

Then full suite, typecheck, production build. Report files changed, test counts, and behavior summary. No publish, no Pass 5.
