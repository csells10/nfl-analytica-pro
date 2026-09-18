# Pass 2B — Remove the Technical Map, keep the list trace

Baseline: 88d8ff844d25f56ee7ec2b42117e8fdd858be64d (Pass 2A). Nothing published.

## What changes for you

The trace panel keeps its readable list of related signals, metrics and lenses. The
graphical "Technical map" (Network and Packed groups) and the "Open technical map"
button disappear. Nothing else in Matchup Lens changes.

## Changes

1. `src/components/matchup-lens/LensDetail.tsx` — remove the "Open technical map"
   button (`data-testid="open-technical-map"`) and its now-unused block. `onOpenTrace`
   stays; tag chips still open the trace drawer.
2. `src/components/matchup-lens/TraceDrawer.tsx` — remove the lazy `TraceGraphs`
   import, the `Suspense` graph block, the `TraceVisual` type, the `visual` state, and
   the whole `VisualSwitch` component including the `technical-map` disclosure and the
   Network / Packed buttons. The drawer renders the list content directly. `snapshot`
   and `target` props become unused inputs to the graph only — keep the props in the
   interface only if still referenced; otherwise remove them from the component and
   its single call site in `src/pages/MatchupLens.tsx`.
3. Delete `src/components/matchup-lens/TraceGraphs.tsx` and
   `src/lib/matchup-lens-trace-graph.ts`.

Preserved unchanged: `src/lib/matchup-lens-trace.ts`, `TraceChips.tsx`, rank and
presentation helpers, trace chips, all evidence relationships, Constellation, Compare,
Biggest Edge, All Six Lenses, Turnover Watch, formulas, warnings, auth, API_BASE,
retry and no-fallback behaviour.

## Tests

- `src/test/matchup-lens-new-features.test.tsx` — drop the
  `technical-map` / `trace-network` / `trace-packed` assertions in the trace-drawer test
  and the stale comment; add an assertion that the list trace content
  (`tag-trace-lenses`, `tag-trace-metrics`) still renders and that
  `technical-map` is absent.
- `src/test/matchup-lens-page.test.tsx` — keep the existing `trace-network` /
  `trace-packed` absence assertions (now permanently true).
- No other test files reference these ids.

## Verification

- Focused: `matchup-lens-new-features`, `matchup-lens-page`, `matchup-lens-presentations`.
- Full suite with exact totals, `tsgo --noEmit`, production build.
- Search for `TraceGraphs`, `buildTraceGraph`, `buildPackedGroups`, `trace-graph`,
  `technical map`, `trace-network`, `trace-packed` and report the results.
- Browser: the trace drawer still opens with readable list relationships, no Technical
  Map / Network / Packed controls, and Overview, Compare, Biggest Edge and All Six
  Lenses still work. Authenticated preview checks remain limited to what the sandbox
  session allows; any gap is reported.

Stop after Pass 2B with changed/deleted files, search results, verification results and
the new immutable version. Nothing published; Pass 3 not started.
