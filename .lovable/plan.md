# Ranking Context UI Placement — Recommendation (analysis only)

No files were changed. Findings below are based on the current code:
`src/pages/Matchup.tsx` (1,843 lines, single render tree), `src/lib/nfl-api.ts`
(typed `GameDetails`; it currently has **no** `ranking_context` type — that type
addition is prerequisite work for options 1 and 3), `src/pages/Placeholder.tsx`
(the `/matchup-lens` route renders a generic "coming soon" card), and
`src/components/SectionGuide.tsx` / `SectionSpotlightTour.tsx` (each Matchup
section is registered in a `tourSteps` array with an `available` flag and a
`data-tour` selector).

---

## Ranking (easiest → hardest to build)

1. **Game Lenses strip on Matchup** — smallest surface, reuses an existing pattern.
2. **League Lens Board at /matchup-lens** — new page, but greenfield and unconstrained.
3. **Movers & Shakers** — blocked until regular-season Week 3 and needs two windows.

---

## 1) Game Lenses strip (recommended first)

**Exact location:** inside the existing Game Profile card in `src/pages/Matchup.tsx`,
as a tag row directly under the `Game Profile` / `Signals` header row and above
the signals grid. It reads as metadata about the matchup rather than a new claim,
and it needs no new vertical section, no new guide step, and no tour entry.

Alternative if the strip should be independently explainable: its own card between
Game Profile and Core Area Advantage, which then also requires a `SectionGuide`
block and a `tourSteps` entry with `available: (ranking_context?.length ?? 0) > 0`.
Prefer the in-card row for the first slice.

**Touched:** `src/lib/nfl-api.ts` (add `ranking_context` to `GameDetails`),
`src/pages/Matchup.tsx`, plus one new presentational `GameLenses.tsx` component.
No routes.

**Density/usability risks:** the Matchup page is already dense; seven featured
metrics rendered as chips would compete with Game Profile. Cap the visible strip
at 3–4 backend-ordered lens tags and drop the rest. Rank/percentile/tier belong in
a tooltip, not on the chip face. Freshness should render as a single quiet
as-of label for the whole strip, not per chip.

**Smallest coherent slice:** render up to 4 backend-provided `lens_tags` as static
labels, ordered exactly as returned, with a tooltip showing `label`, `core_area`,
league rank and tier verbatim. No click targets, no filtering, no derived wording.

---

## 2) League Lens Board (replaces /matchup-lens)

**Exact location:** replace the `Placeholder` element for `/matchup-lens` in
`src/App.tsx` with a new lazy `MatchupLens` page. Keep the route path and the
existing "Matchup Lens" nav item in `src/components/AppShell.tsx` unchanged.

Page structure: a control row (Lens Tag select, as-of date, window select) over a
team grid. Each team card shows the selected metric's league rank, percentile and
tier for one window only.

**Touched:** `src/App.tsx`, new `src/pages/MatchupLens.tsx`, a new
`src/lib/lens-api.ts` fetch layer plus a query hook, small components for the
control row and team card, and `src/lib/nfl-teams.ts` for logos/abbreviations.

**Density/usability risks:** 32 team cards on one screen is the main risk — a
compact single-metric card with a percentile bar scans far better than a full
heatmap, and a heatmap of 73 metrics would be unreadable. In preseason the window
control must be locked to `preseason_to_date` (single option, disabled) so the UI
never implies a comparison that has no data. Any sort or "top/bottom" grouping must
come from backend order, not a frontend sort of football meaning.

**Smallest coherent slice:** one Lens Tag selector (backend-supplied list), window
fixed to the only available window, a flat 32-team grid sorted by backend-returned
rank, with a visible as-of date. No comparison, no trend, no favorites.

---

## 3) Movers & Shakers

**Exact location:** a second tab or view mode inside the same `/matchup-lens` page
from option 2, not a separate route — it shares the lens-tag selector and team
cards, changing only the window pair.

**Touched:** `src/pages/MatchupLens.tsx` and its lens fetch layer; nothing else.

**Density/usability risks:** it must stay dark until the backend reports that both
`last_3_games` and `regular_season_to_date` exist for the selected as-of date.
Gate on window availability returned by the backend, not on a frontend date
calculation, and hide the tab entirely rather than showing an empty state — an
"available Week 3" message invites the movement reading we are avoiding. All
delta values, direction words and significance must come from the backend.

**Smallest coherent slice:** deferred. Do not build it until the regular season
provides both windows.

---

## Guardrail this preserves

The frontend renders backend structure only. Labels, categories, core areas,
ranks, tiers, ordering, window availability and any delta wording all come from
the API. No frontend sorting by football meaning, no derived tiers, no
week-over-week language while only `preseason_to_date` exists.
