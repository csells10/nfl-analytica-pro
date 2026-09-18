# Pass 2A — Remove the Collision destination and dedicated view

Baseline: `cb71d65c9b2c22ebde9b32dc19521b4523e86342` (Pass 1, 143/143 tests, nothing published).

Goal: Collision stops being a place you can go. The collision-derived sentences stay on the Overview as plain read-only insights, with no clickable dead ends.

## What changes for the user

- The Overview no longer offers a "Where profiles collide" card, and "Continue exploring" no longer suggests it.
- The collision line in "Start here" and the collision story in the insight ticker stay visible and readable, but are no longer clickable.
- An old or shared link with `view=collision` quietly lands on the Overview instead of an empty screen.
- Compare, Biggest Edge, All Six Lenses, Constellation, Technical Map, Turnover Watch and trace are untouched.

## Technical details

Files changed:

- `src/pages/MatchupLens.tsx`
  - Remove the `MatchupCollision` import and its render block.
  - Remove the `collision` destination card entry, the `collision` continue-exploring step, the `openCollision` callback, and the collision branch of the destination/continue handlers.
  - Remove `collisionKey` from URL state (read, write, canonicalisation, lane-drop logic) and the `view === "collision"` title branch.
  - Keep `collisionDirections` / `collisionHighlights` calls — they still feed the brief and ticker stories.
  - Ticker: a story with `target.kind === "collision"` no longer navigates; render it as a non-interactive story.
  - Deep-link normalisation: if the parsed view is `collision` (direct or via legacy `mode=collision`), redirect to `view=overview` with `replace` so there is no history loop; strip a stray `collision=` param at the same time.
- `src/lib/matchup-lens-view.ts`
  - Drop `collision` from `LensView`, `LENS_VIEWS`, `VIEW_TITLES`, `LensOrigin`, `LENS_ORIGINS`, and the `originReturn` case.
  - Map legacy `mode=collision` to `{ view: "overview" }`.
- `src/components/matchup-lens/DestinationCards.tsx`
  - Drop `collision` from `DestinationId` and `DESTINATION_ICONS` (remove the now-unused `Swords` import).
- `src/components/matchup-lens/GameBrief.tsx`
  - Collision-keyed observations render as static text (badge + definition tooltip retained, no Explore affordance, no button). Lens-keyed observations keep their existing click-through.
- `src/lib/matchup-lens-stories.ts`, `src/lib/matchup-lens-brief.ts`, `src/lib/matchup-lens-angle.ts`
  - Keep the collision text and calculations. The `collisionKey` field remains on the data shape as a read-only marker so the UI knows the row is non-interactive; no wording changes.

Deleted: `src/components/matchup-lens/MatchupCollision.tsx` only.

Unchanged: `src/lib/matchup-lens-collision.ts`, all formulas, weights, tags, exclusions, warnings, canonical teams, dates, auth, API_BASE, retry and no-fallback behaviour, Technical Map.

Tests touched (only directly affected):

- `src/test/matchup-lens-page.test.tsx` — remove the `destination-open-collision` navigation test; keep the assertions that `matchup-collision` is absent.
- `src/test/matchup-lens-journey.test.tsx` — remove the `continue-collision` step test, replace with a continue-step case that still exists.
- `src/test/matchup-lens-presentations.test.tsx` — remove the collision card height test.
- `src/test/matchup-lens-continuity.test.tsx` — remove the stale-lane test; add: `view=collision` normalises to Overview via replace (no extra history entry, no blank state).
- `src/test/matchup-lens-new-features.test.tsx` — keep the pure `collisionDirections` test; update the `parseView("collision")` assertion to expect `overview`.
- Add: Overview still renders the collision observation text, and that row is not a button.

## Verification

Focused Matchup Lens tests, then full suite with exact totals, `tsgo --noEmit`, production build, and a browser check that Overview keeps the read-only collision line, that Compare / Biggest Edge / All Six Lenses still open, and that `view=collision` lands on Overview without a loop.

Stops after Pass 2A. Nothing published; Pass 2B not started.
