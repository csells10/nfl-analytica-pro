# Pass 3 corrective follow-up — read-only inspection and proposal

Baseline inspected: `3de0be7d19dc728404608f7c36edacced32f2839`. No files were changed.

## 1. Header hierarchy

What renders what today:

- Global GameLens header: `src/components/AppShell.tsx` (sticky `<header>`, logo, Matchups link, Help, theme, account menu).
- "Matchup Dashboard" title and purpose line: `src/pages/MatchupLens.tsx` (~line 635), a bare `<header>` with `h1` plus a muted paragraph, rendered above every state including empty, loading and error.
- Matchup / date / current-view strip and the Overview action: `src/components/matchup-lens/MatchupContextBar.tsx`, sticky at `top-[6.1rem]` (`md:top-14`), carrying team labels, window + as-of line, "Viewing: …", refresh status, notices, and the single back-to-Overview button.
- Each view then adds its own section heading: `DestinationCards.tsx` ("Choose what to explore"), `LensExplorer.tsx` ("All six lenses"), `LensConstellation.tsx` (its own title and layout switch inside a Card), `LensDetail.tsx` (lens name).

Why the title feels inconsistent: there is no single masthead. The page `h1` is a naked block with its own spacing, the context bar is a sticky bar with different padding, and each view then supplies a second heading at a different size inside a Card. Views with a Card-wrapped heading (Constellation, All Six Lenses) gain extra card padding above their title; Overview and lens detail do not, so the vertical gap between the sticky strip and the first real content differs per view. The sticky offset (`6.1rem`) is also hard-coded against the global header height, so any title-block change shifts the strip.

Smallest fix (Pass 3D): extract one `MatchupMasthead` component rendered once in `MatchupLens.tsx` directly under the global header, containing the `h1`, the purpose line and the current-view label in one compact block with fixed spacing; keep `MatchupContextBar` as-is beneath it, and give the per-view content one shared top spacing value. No wording, control or information is removed — the view heading inside each Card stays, only the surrounding spacing becomes uniform.

## 2. Persistent lens styling and state

State relationships:

- `selectedLens` lives only in the URL (`lens=` parameter), read in `readUrlState` and written in `writeUrlState` (`MatchupLens.tsx` 129–170).
- `activeAxis` is local React state (line 229), set by hover, pointer-down and score-tile focus, cleared on blur, on view change and on game change.
- `activeKey = view === "constellation" ? (activeAxis ?? selectedLens) : selectedLens` (line 255). `activeLens` is derived from it and feeds the lens-detail evidence block and the trace drawer's "checked against …" label.
- `LensConstellation` receives both `selectedKey={selectedLens}` and `activeKey={activeAxis}`; axis lines, axis labels and score tiles highlight when `axis.key === selectedKey || axis.key === activeKey`. `LensRadar` applies the same rule in both side-by-side charts.
- `LensExplorer` no longer takes a selected key (corrected in the last Pass 3 fix); at `3de0be7d` it still did, which is the source of the reported All-Six-Lenses highlight.

Data impact: presentation only. Scores come from `scoreAllLenses(snapshot, team)` and `lensGaps`, which depend on the snapshot and the canonical team rows and never on `selectedLens`. Evidence rows and the API query (`["matchup-lens-context", gameId]`) are equally independent; `selectedLens` only chooses which lens detail to render and which lens name the trace drawer cites. There is no filter that changes numbers, evidence or fetched data.

Why a previously viewed lens stays highlighted: `selectedLens` persists in the URL after you leave the lens detail, and the constellation ORs it into the same highlight used for hover. So the old lens is emphasised at rest, and hovering another axis lights a second one.

Proposed fix (Pass 3C): on navigation-choice surfaces, highlight only transient interaction.

- `LensConstellation`: drop `selectedKey` from the highlight expressions (axis lines, labels, tiles) and from `aria-pressed`; highlight on `activeKey` only. On the constellation view, `activeKey` becomes `activeAxis` alone.
- `LensRadar`: same — highlight from `activeKey` only; keep `selectedKey` out of the visual rule (remove the prop if it becomes unused).
- Keep `selectedLens` in the URL, keep every navigation target, keep lens-detail rendering and trace behaviour unchanged.

## 3. Overview destination layout

`DestinationCards.tsx` uses `sm:grid-cols-2 xl:grid-cols-4` while only three destinations exist (Collision was removed in Pass 2A), so at `xl` the row reserves a fourth column and the last slot is empty; at `sm`–`lg` the third card sits alone on a second row.

Fix (Pass 3D): change the desktop grid to three equal columns (`sm:grid-cols-3`, no `xl` override) and keep the existing mobile snap carousel. Wording, destinations, icons, disabled state and the Open action are untouched.

## Implementation split

Pass 3C — lens-state correction (presentation only)
- `src/components/matchup-lens/LensConstellation.tsx`
- `src/components/matchup-lens/LensRadar.tsx`
- `src/pages/MatchupLens.tsx` (only the `activeKey` derivation and the props it passes)

Pass 3D — masthead and card layout
- `src/pages/MatchupLens.tsx` (masthead block, shared view spacing)
- new `src/components/matchup-lens/MatchupMasthead.tsx`
- `src/components/matchup-lens/DestinationCards.tsx` (grid columns only)
- `src/components/matchup-lens/MatchupContextBar.tsx` only if the sticky offset must be re-tuned

Explicitly unchanged in both passes: formulas, scores, weights, tags, exclusions, evidence selection and ordering, canonical teams, dates, warnings, URL parameters, navigation targets, auth, API_BASE, retry and no-static-fallback behaviour.

## Tests required

Pass 3C (`src/test/matchup-lens-presentations.test.tsx`, `src/test/matchup-lens.test.tsx`)
- With a `lens=` parameter present, no constellation axis or score tile is emphasised at rest (no `data-axis-active`, no `aria-pressed="true"`).
- Hovering or focusing one tile emphasises exactly one axis; blur clears it.
- Both layouts (overlay and side-by-side) reflect the same single active axis.
- Clicking a tile or axis still opens that lens detail with the existing URL.

Pass 3D (`src/test/matchup-lens-page.test.tsx`, presentations test)
- The `h1` masthead renders exactly once across Overview, Constellation, All Six Lenses and lens detail, and the context strip still shows matchup, date line, "Viewing: …" and the Overview action.
- Destination cards: three cards render and the desktop grid class is three-column; existing card wording, icons and open behaviour assertions stay.

## Accessibility notes

- Removing `aria-pressed` from constellation tiles is correct once nothing is persistently selected; they become plain navigation buttons. Current view continues to be announced through the context strip's "Viewing: …" text.
- Hover/focus emphasis must remain non-essential styling: the visible focus ring stays the accessibility contract, and colour is never the only cue for which lens is open.
- Score tiles remain the only keyboard tab stops; SVG hit areas stay `tabIndex={-1}`.
- The masthead must keep a single `h1` per page with view headings as `h2`, preserving heading order for screen-reader navigation.
