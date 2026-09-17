# Repair: adapter rejects the real `method` block

The authenticated production response for `20260917_DET@BUF` returned HTTP 200, but the page discarded it because the adapter demands two `method` fields that the frozen contract never defined. This is a frontend-only repair.

## What goes wrong today

`src/lib/matchup-lens-adapter.ts` validates and maps:

- `method.percentile_basis` must equal `"league"` (invented)
- `method.polarity` must equal `"corrected"` (invented)
- `method.notes` (invented)

The frozen contract's `method` is exactly `selection`, `frontend_role`, `forecast`. Production sends those three, so the first check fails and a valid 200 is thrown away.

## Repair

1. **Transport type** (`src/lib/matchup-lens-api-types.ts`) — replace `MatchupLensV1Method` with the frozen shape: `selection: string`, `frontend_role: string`, `forecast: boolean`.
2. **Adapter** (`src/lib/matchup-lens-adapter.ts`) — remove the `percentile_basis` / `polarity` / `notes` checks and mapping. Validate the real fields instead: `method` must be an object, `selection` and `frontend_role` non-empty strings, `forecast` a boolean. `AdaptedMatchupLensContext.method` becomes `{ selection, frontendRole, forecast }`. No other validation is loosened; the percentile 0-100 range check, signal-strength agreement, six-row readiness order, canonical team agreement and league-context mode checks all stay exactly as they are.
3. **Field-by-field audit** — walk every key the type file and validator touch (`schema_version`, `available`, `reason`, `game`, `display`, `basis`, `metric_catalog`, `away`, `home`, `coverage`, `warnings`, `league_context`, `method`) against the frozen contract and against the shape actually returned by the authenticated call. Anything invented or renamed gets the same treatment as `method`: removed, not synthesised. Anything the contract really declares keeps its current strictness. The audit result is reported in the evidence packet, including a statement that no other invented field was found (or the list, if any).
4. **Console hygiene** (`src/lib/matchup-lens-live.ts`) — drop the `console.error("[matchup-lens] contract violation:", err.detail)` line. The typed `ApiError` still flows to the page, which keeps showing its safe generic unreadable-response state. Validator detail stays inside the thrown error object, out of browser logs.
5. **Fixtures** (`src/test/matchup-lens-v1-fixture.ts`) — its `method` block currently carries the invented fields; switch it to the production shape.

## Tests

- Regression test: adapter accepts a payload whose `method` is exactly the production object (`selection`, `frontend_role`, `forecast: false`) with no `percentile_basis`, and produces a scored snapshot.
- Negative test: a `method` that is malformed in a way the contract does care about (e.g. `forecast` not a boolean, or `method` null) still throws `MatchupLensContractError` and scores nothing.
- Remove the now-obsolete rejection cases "a non-league percentile basis" and "an uncorrected polarity" from the adapter suite; record both removals in the evidence packet.
- No other assertion is changed or weakened.

## Verification

Adapter tests, live-page tests, full frontend suite, typecheck, build. Then reload the authenticated DET/BUF page in the preview and read the console and rendered state.

- If the page renders, collect the authenticated acceptance evidence (canonical teams and IDs, dates, metric counts, six readiness rows, context metrics excluded, DET Drive Control partial vs BUF complete, warnings, league suppression, absence of numerator/denominator) and update the 21-item packet.
- If a different contract mismatch appears, stop immediately and report the exact field and expected-vs-actual value before touching anything else.

Nothing is published or deployed.
