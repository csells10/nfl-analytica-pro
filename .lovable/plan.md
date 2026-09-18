# Pass 3 — Matchup Lens interaction polish

Baseline: 6348242637fd20ce216279327be9f924784537e7 (Pass 2B). Nothing published.

## What changes for you

- Pointing at, tapping, or keyboard-focusing a lens score tile highlights the same
  lens on the chart, in both the overlay and side-by-side layouts.
- The evidence arrows appear only when the evidence row actually scrolls, and the
  arrow at either end is disabled once you reach it.
- The evidence expander says "Show 4 more" instead of "View all evidence (7)".
- The selected tile under All six lenses reads as active instead of grayed out.

Scores, wording of the evidence itself, chart geometry, lens order and every backend
behaviour stay exactly as they are.

## A. Shared active axis

`src/pages/MatchupLens.tsx`: rename the existing `hoveredLens` state to a single
`activeAxis` state used as the shared active-axis source. It keeps its current reset
behaviour on game or view change and still feeds `activeKey`
(`activeAxis ?? selectedLens` on the constellation view) so no derived reading,
score or label changes. Pass `activeKey={activeAxis}` and
`onActiveAxisChange={setActiveAxis}` into `LensConstellation` in place of `onHover`.

`LensConstellation.tsx`:
- Accept `activeKey: string | null` and `onActiveAxisChange`. Highlight an axis when
  it matches `activeKey` or `selectedKey` (selection highlighting stays as today).
- Overlay SVG hit circles: keep `onClick` selection, keep mouse enter/leave, add
  `onPointerDown`/`onPointerEnter` so touch taps set the active axis too. They stay
  `focusable={false}` with no `tabIndex`, so no second tab stop is created.
- Score tiles stay the keyboard controls: `onFocus`/`onBlur`, `onMouseEnter`/
  `onMouseLeave` and `onClick` all report through `onActiveAxisChange`, and click
  still selects the lens.
- Forward the active key into both `LensRadar` instances so side-by-side highlights
  match the overlay.

`LensRadar.tsx`: add an optional `activeKey` prop and an optional
`onActiveAxisChange`; the axis line and label highlight when the axis is selected or
active. The hit circle gains pointer enter/leave/down handlers; it remains
non-focusable. Geometry, ring values, axis order and `data-*` attributes unchanged.

## B. Evidence rail overflow

`EvidenceRail.tsx`: add `canScrollLeft` / `canScrollRight` state derived from a single
`measure()` reading `scrollLeft`, `clientWidth`, `scrollWidth` with a 1px tolerance.
Run it on mount, on the scroller's `scroll` event, on a `ResizeObserver` attached to
the scroller, on a `window` resize listener, and whenever the `rows` prop changes
(expansion/collapse). All listeners and the observer are cleaned up on unmount.
Render the arrow group only when either direction can scroll; each button gets
`disabled` at its end plus `disabled:opacity-40 disabled:cursor-not-allowed`. Labels,
keyboard operation, snap classes and touch scrolling are untouched.

## C. Expansion wording

`LensDetail.tsx`: the collapsed label becomes `Show ${ordered.length - FIRST_CARDS} more`;
the expanded label stays `Show key evidence only`. Row selection and ordering unchanged.

## D. Selected lens tile

`LensExplorer.tsx`: the selected tile uses `border-primary bg-primary/10 text-foreground`
with a `ring-1 ring-primary/40` instead of `bg-secondary`, keeping `aria-pressed`,
hover, focus ring and click/keyboard behaviour. Existing semantic tokens only.

## Tests

Directly affected Matchup Lens tests only:
- Constellation: focusing a score tile marks the matching axis active; hovering a tile
  and an SVG hit area produce the same highlight; SVG hit areas add no tab stop.
- Evidence rail: with no overflow (jsdom default metrics) the arrows are absent; with
  stubbed `scrollWidth`/`clientWidth` the arrows appear and the start/end button is
  disabled.
- Evidence toggle: asserts the hidden-row count in `Show N more` and the unchanged
  collapse label.
- Explorer: the selected tile carries the primary selected styling and stays clickable.

## Verification

Focused tests, full suite with exact totals, `tsgo --noEmit`, production build, and
browser checks at 1280px and 390px covering tile focus/hover/tap highlighting in both
layouts, arrow states at start/middle/end plus after expansion and resize, touch
scrolling, the `Show N more` count, and the selected explorer tile.

Known limitation to report rather than work around: the sandbox cannot create a
signed-in preview session (Google Sign-In injection is blocked), so authenticated
browser evidence depends on your manual preview; automated coverage carries the rest.

Stop after Pass 3. Nothing published; Pass 4 not started.
