# Pass 5 — Preserve the Matchups date on return

When someone picks a date on Matchups, opens a game or the Matchup Lab, and then taps
Matchups again, they come back to the same date instead of the default one.

## What changes for the user

- Opening the Lab from a date on Matchups remembers that date.
- Matchups → game details → Lab remembers the same date.
- Moving between Lab views keeps the date.
- The Matchups link in the header (desktop and mobile tab row) returns to that date.
- Refreshing a Lab page keeps the return date, because it lives in the address.
- An old or shared Lab link with no date still works exactly as today.

## How it works

The date travels as one extra, optional piece of the Lab address: `fromDate=YYYY-MM-DD`.
It is navigation context only — nothing about the request, the game identity, the teams,
the evidence, scores, availability or retries reads it.

### Files to change

1. `src/lib/matchup-lens-link.ts`
   - Add `isValidFromDate(raw)`: strict `YYYY-MM-DD` shape plus a real-calendar round-trip
     check (rejects `2026-02-30`, `2026-13-01`, `26-9-1`, empty, junk).
   - `buildMatchupLensHref(gameId, awayAbbr, homeAbbr, fromDate?)` appends `fromDate`
     only when valid; otherwise omits it. Existing three-argument calls are unaffected.
   - Add `matchupsHref(fromDate?)` returning `/?date=<fromDate>` when valid, else `/`.

2. `src/pages/Slate.tsx`
   - Pass the currently selected `dateParam` into `buildMatchupLensHref`.
   - Game-details navigation keeps its current `?date=` + `state.fromDate` behavior.

3. `src/pages/Matchup.tsx`
   - Derive the known return date from `?date=` or `location.state.fromDate` (validated,
     reusing the same helper) and pass it into `buildMatchupLensHref` for the Lab action.
   - "Back to games" logic stays as it is.

4. `src/components/AppShell.tsx`
   - On `/matchup-lens` only, the Matchups nav destination (desktop nav and mobile tab row)
     becomes `matchupsHref(params.get("fromDate"))`. Invalid or missing → `/`.
   - Header logo, Lab link, Help, theme, and account menu are untouched.

5. `src/pages/MatchupLens.tsx`
   - `fromDate` is already carried across view changes because the URL writer copies the
     existing query string and only touches its own keys — a test will lock this in.
   - `goToSlate` (empty/unavailable recovery) uses `matchupsHref(fromDate)`.

Nothing else changes: no storage, no new route, no new state layer, no backend, API base,
auth, query keys, validation, retry, guides, loaders, transitions or empty-state changes.

### Tests

Extend `src/test/matchup-page-navigation.test.ts` and the existing Lab route-level suite with:

- Matchups → Lab carries the selected date.
- Matchups → game details → Lab carries the same date.
- Changing Lab views preserves `fromDate`.
- Lab header Matchups link resolves to `/?date=<fromDate>`.
- A fresh render of a Lab URL with a valid `fromDate` keeps the return destination.
- Missing, malformed and impossible dates (`""`, `2026-9-4`, `2026-13-01`, `2026-02-30`,
  `banana`) fall back to `/`.
- Returning with an explicit date does not trigger the seven-day auto-selection.
- Request key, API call, canonical teams, guides, loading states and retry behavior unchanged.

Then run the focused tests, the full suite, typecheck and the production build, and report
files changed, counts and behavior. Nothing published or deployed.
