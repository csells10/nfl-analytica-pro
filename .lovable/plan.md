# v1.7.14 — Core Area Advantage display-strength wiring

UI-only patch. Make Core Area tile labels/captions prefer the newer backend `matchup_breakdown.core_area_summaries.display_*` fields so areas read as "Lean" / "Near Even" when the backend says so, instead of always rendering "Edge" from raw `leader`.

## Field precedence

**Tile label (edge text in the top-right of each tile):**
1. If matching summary has a directional `display_strength` (`lean` / `edge` / `strong_edge`) AND a safe `leader_team`: `{leader_team} {mapped}` → e.g. `BUF Lean`, `ATL Edge`.
2. Else if `display_strength === "near_even"`: `Near Even`.
3. Else fall back to current logic from `core_area_comparison.leader` (`{ABBR} Edge` / `Even`).

Mapping: `near_even → Near Even`, `lean → Lean`, `edge → Edge`, `strong_edge → Strong Edge`. Unknown values fall through to legacy.

`leader_team` safety: reuse existing `safeTeam` regex/length check already in `buildTitle`.

**Tile caption (small line under the title):**
1. `display_summary` (if passes existing `isUsableSummary`-style safety: length 16–240, no jargon tokens, not noise).
2. Existing matched `summary` (same safety check — already used by the popover).
3. Existing `RELATIONSHIP_LABEL[core_area]` fallback (unchanged).

Caption rendered in the same `<p class="mb-2 text-[10px] text-muted-foreground/70">` slot that today holds `relationship` — no new DOM node, no new section.

## Files

**`src/lib/nfl-api.ts`** — extend `matchup_breakdown.core_area_summaries[]` type (additive, all optional):
- `display_strength?: "near_even" | "lean" | "edge" | "strong_edge" | string | null`
- `display_summary?: string | null`
- `leader_source?: string | null` (typed only, never rendered)
- `driver_alignment?: string | null` (typed only, never rendered)
- `broad_score_gap?: number | null` (typed only, never rendered)
- `headline_driver_leader?: string | null` (typed only, never rendered)

**`src/components/CoreAreaAdvantage.tsx`** — inside the existing `rows.map`:
- Resolve `matched` summary with current `findSummary` (already by normalized name, not index).
- Compute `displayEdgeLabel` via precedence above; replace current `edgeLabel` string. Keep the same `<span>` and the same `isNeutral` styling rule (treat `near_even` as neutral for the muted-color branch).
- Compute `displayCaption` via precedence above; render in the existing relationship `<p>` slot.
- Reuse `isUsableSummary` for `display_summary` validation (rename internal var if needed; same rules).
- Keep popover, score bars, percentages, metric count, ordering, classes, and tile layout exactly as-is.

## Not changing

Score math, bars, percentages, metric counts, tile order, popover behavior, Matchup Lean, Team Comparison, Model Trust, Game Profile, routing/fetching, team colors, green/red colors, onboarding/tour. No new sections, badges, pills, or hover behavior. No exposure of `leader_source` / `driver_alignment` / `broad_score_gap` / `headline_driver_leader`.

## QA — `/matchup/20251013_BUF@ATL`

- Disruption and Turnovers: expect `BUF Lean` (was `BUF Edge`) if backend sends `display_strength: "lean"` + `leader_team: "BUF"`.
- Defensive Control: still ATL-directional (label follows backend; falls back to `ATL Edge` if no `display_*`).
- Offensive Output / Scoring Efficiency: still BUF-directional.
- Percentages, metric counts, bar widths unchanged.
- No new badges/sections; tile heights stable.
- Tiles missing `display_*` render identical to today.

## Post-build summary

- files changed
- exact label precedence used
- exact caption precedence used
- confirmation legacy fallback remains
- QA notes for `20251013_BUF@ATL`
