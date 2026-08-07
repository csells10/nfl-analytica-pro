# Team Comparison unavailable — design concepts

## What the code shows today

`src/pages/Matchup.tsx` renders the Team Comparison card only when `team_comparison` is a non-empty array (line 1730). When the backend omits it — the normal case before a team has played its first game of a season — the card simply doesn't render and the page has a gap between Model Trust / Matchup Lean and the tour footer. There is no fallback state at all.

Fields already available in the response we can infer from (no backend work):

- `header.game_status` (`Scheduled`, `Final`, `Final/OT`), `header.season`, `header.season_type`, `header.game_week` (e.g. Hall of Fame Weekend), `header.game_date`, `header.espn_link`
- `matchup_lean` (present or not), `game_profile`, `core_area_comparison`, `matchup_breakdown`, `model_outcome`, `final_score`

Note: `ranking_context` is not present in the `GameDetails` type, so no concept relies on it.

## Concepts

### 1. Season Baseline Notice (inline explainer card)
A card in the Team Comparison slot with the same header (Swords icon, "Team Comparison"), the eyebrow changed from "Season averages" to "Awaiting season data", and one sentence derived from `season_type` + `game_week`: "Season averages begin after each team's first {season} game. This is {Hall of Fame Weekend}, so neither side has {season} data yet."
- Pros: minimal, matches existing card chrome exactly, teaches the rule in one line.
- Cons: static text only; no data value.

### 2. Ghosted Comparison Preview
Render the real card structure — team header row with both logos and the usual metric labels — but with values shown as muted em-dashes and a single caption explaining when they populate.
- Pros: premium, teaches the layout the user will see next week, keeps visual rhythm.
- Cons: metric labels come from `team_comparison` today, so the label list would have to be hardcoded — a contract-drift risk if the backend metric set changes.

### 3. "What we can still tell you" redirect card
Instead of explaining absence, point at what *is* present: chips linking to the sections that did render (Game Profile, Core Area Advantage, Matchup Lean), each shown only if that field exists.
- Pros: turns a dead zone into navigation; purely derived from existing state.
- Cons: on a true week-one game most of those sections are also empty, so the card can end up nearly bare.

### 4. Data Readiness Timeline
A small three-step horizontal timeline: Pre-season profile → First game played → Season averages live. The current step is derived from `game_status` and whether `team_comparison` exists.
- Pros: distinctly premium and data-driven; explains the model's lifecycle, not just this page.
- Cons: more new UI to build and maintain; risks over-explaining for a one-off case.

### 5. Per-team readiness row
Two rows, one per team, each with logo and a status pill ("No {season} games played"). Since the response can't tell us per-team game counts, both rows would carry the same state whenever the comparison is missing.
- Pros: visually parallel to the real comparison card.
- Cons: implies per-team precision the payload can't back — violates the "don't invent data" rule.

### 6. Merge into Matchup Lean as a footnote
No new card. Add one muted line under Matchup Lean: "Metric-level comparison unlocks after both teams have played a {season} game."
- Pros: zero layout weight, cheapest option.
- Cons: easy to miss; leaves the visual gap unresolved, which is the actual complaint.

## Recommendation

**Concept 1, with the strongest element of Concept 2.** Render an explainer card in the Team Comparison slot that reuses the existing card chrome and the real team header row (both logos + short names, which come from `header`, always available), followed by the derived one-sentence explanation and a muted "Season averages" eyebrow replaced by "Awaiting season data". That keeps the page rhythm intact and feels like the same product, without hardcoding a metric list.

Copy is derived, not invented:
- Scheduled + season_type is preseason/week-1-ish → "Season averages begin after each team's first {season} game."
- Final with no comparison → "Season averages weren't available for this matchup."
- Append the week label when `header.game_week` exists: "This is {game_week}."

## Technical notes

- Single new component, e.g. `src/components/TeamComparisonUnavailable.tsx`, rendered from `src/pages/Matchup.tsx` in the `else` branch of the existing `team_comparison && length > 0` guard (lines 1722–1729 for the SectionGuide, 1730 for the card).
- Props: `awayTeam`, `homeTeam`, `awayLogo`, `homeLogo`, `header.season`, `header.season_type`, `header.game_week`, `header.game_status`. No API or type changes.
- Semantic tokens only (`border-border`, `bg-card`, `text-muted-foreground`); no new colors.
- Keep `data-tour="team-comparison"` on the fallback so the spotlight tour still has a target, and flip that tour step's `available` to true in both states.
