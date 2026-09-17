# Phase G3 — finish verification and evidence packet

Continue the live Matchup Lens integration. No publishing, no deployment, no changes to lens formulas.

## 1. Resolve the five test/UI mismatches against the contract (not against green results)

For each, judge the rendered behaviour first, then change whichever side is wrong.

| Case | Rendered today | Judgement | Action |
| --- | --- | --- | --- |
| No game | "Choose a matchup first" + "Go to the Slate" action | Satisfies the contract (clearly directs to the Slate) | Align test expectation to the real copy, including the typographic apostrophes |
| 403 | Title "Access denied", no retry control | Safe, but the title is system-speak rather than user language | Reword UI to "You don't have access to this matchup" and keep the no-retry behaviour; test asserts that copy |
| Unreadable / contract-invalid response | "The matchup evidence didn't arrive in a usable form", nothing scored | Behaviour is correct; wording is long and does not name the cause | Reword UI to "This matchup's evidence couldn't be read" plus the existing explanatory line; test asserts the new title and asserts that no lens score renders |
| Retry control | Calls `refetch()` on the current query key only | Correct — retries only the current game | Align test to the real button label and add an assertion that the refetched URL carries the same game id |
| Uneven evidence | Page notice "Evidence is uneven for …"; per-lens note "Uneven evidence — the score uses only the values present. TEAM: missing metric" | Correct: names team and lens, never implies zero | Align tests to the real wording, and keep the existing assertion that "counted as zero" never appears |

## 2. Migrate the older page tests

Files: `matchup-lens-page.test.tsx`, `matchup-lens-continuity.test.tsx`, `matchup-lens.test.tsx`, `matchup-lens-journey.test.tsx`, `matchup-lens-presentations.test.tsx`, `matchup-lens-new-features.test.tsx`.

- Keep every scoring, navigation, accessibility, Collision, Turnover Watch, continuity and interaction assertion as-is; only their data source changes from the preseason snapshot to the live fixture harness (`installLensFetchMock`, `withGame`).
- Replace only two classes of expectation: those that require the removed preseason runtime source, and those that require visible league-rank output in the page. Each replacement becomes an explicit live-only / no-static-fallback / rank-suppression assertion.
- Pure unit tests of the ranking helpers (`matchup-lens-rank`, `rankText`) stay unchanged — the helpers are untouched; only their display is suppressed.
- Record every replaced assertion (file, test name, old expectation, new expectation, reason) for the evidence packet.

## 3. Verify

- Full frontend suite, typecheck, build; read the build log before reporting.
- Authenticated DET/BUF acceptance against `GET /game/20260917_DET@BUF/lens-context`: status 200, schema and availability, canonical teams and ids, dates and counts (63/62/63/62), six readiness rows in frozen order, 16 context metrics excluded by the adapter, DET Drive Control partial and BUF complete, warnings present, league context suppressed, no numerator/denominator fields. No token is printed, logged or stored.

## 4. Deliver

Return the 21-item evidence packet, stating explicitly what is local implementation versus preview versus production-published (nothing published).

## Known blocker risk

The signed-in acceptance check needs a browser session for the app's Google sign-in. If no session can be established in this environment, everything else completes and the acceptance check is reported as an open blocker with the exact reason rather than being faked or skipped silently.
