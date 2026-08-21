# Run Visibility diagnostic line — verify it renders

The diagnostic code is present on this branch and is being served by the preview: `AdminRunVisibility.tsx` renders a `run-visibility-diagnostic` line under the friendly message, and `safeDiagnostic()` builds it in `run-visibility-api.ts`. So the most likely explanations for an empty area are (a) a stale cached bundle in your browser, or (b) the thrown error carries no diagnostic fields, in which case `safeDiagnostic()` returns `null` and nothing renders at all.

This pass proves which one it is, and removes the silent-null case.

## Steps

1. Drive the preview headlessly against the real page and capture the rendered error panel. This confirms whether the current code emits a diagnostic line at all with the live backend response.
2. Remove the silent case: if `safeDiagnostic()` has nothing to report, render a fallback line instead of nothing, e.g. `phase: unknown · no diagnostic fields` plus the error class name (`RunVisibilityError` / `Error`). Non-`RunVisibilityError` failures also get a line (class name only) so the area is never blank.
3. Add a small build stamp to the diagnostic line (short commit-less marker such as `dx1`) so you can tell at a glance whether your browser has the new bundle.
4. Update the existing tests for the fallback and stamp; run tests and typecheck.

## Technical notes

- Files touched: `src/lib/run-visibility-api.ts` (fallback branch in `safeDiagnostic`, marker constant), `src/lib/run-visibility.test.ts`, `src/test/run-visibility-page.test.tsx`. `AdminRunVisibility.tsx` only if the fallback needs a render change.
- Still never printed: token, headers, response body, stack trace, secrets.
- No infrastructure change, no publish, no merge, no fix attempt on the underlying backend status.
- On your side: hard-reload the preview (or open it in a private window) so the old bundle is discarded.
