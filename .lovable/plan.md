# Phase G3 — Final Evidence Packet (read-only closure)

No code changes, no publication, no deployment are proposed. This records the completed Phase G3 state.

## Status taxonomy
- **Implemented locally in Lovable source:** all Phase G3 code and tests.
- **Verified in authenticated Lovable preview:** the authenticated DET/BUF acceptance.
- **Production frontend publication:** not published.
- **Deployment:** not performed.

## The 21 items

1. **Scope** — Frontend-only connection of Matchup Lens to the authenticated production `matchup_lens_v1` endpoint; no backend changes.
2. **Endpoint** — `GET /game/<encoded-game-id>/lens-context` on the retained shared API base.
3. **API base** — Verified against the endpoint; current base retained (unauthenticated probe returned 401 at the endpoint, 405 at root on both candidate hosts).
4. **Auth** — Existing Firebase bearer via `src/lib/nfl-api.ts` (`authHeaders()`); no token value logged, persisted, or exposed.
5. **Transport types** — `src/lib/matchup-lens-api-types.ts`, aligned to the real production envelope (`metric_catalog: string[]`, `teams.away/home`, `basis.window_type/source_data_dates/...`, readiness `display_name/comparison_status/counts`, `coverage.warnings`, league context `mode/reason_code/message`, frozen method literals).
6. **Adapter** — `src/lib/matchup-lens-adapter.ts` `adaptMatchupLensV1()`: strict validation; scoring `MetricDefinition`s built deterministically in catalog order from the union of team metric entries; cross-side metadata agreement required; `available:false` is valid, not malformed.
7. **Context exclusion** — 16 transported `context` metrics excluded from scoring definitions and percentile maps without coercion; 47 scoring definitions remain.
8. **Scoring engine** — Unchanged: six-lens order, formulas, strong=2/supporting=1, volume ×0.5, volatility ×0.75, tag matching, exclusions. `matchup-lens-rank.ts` untouched.
9. **Query wiring** — Key exactly `["matchup-lens-context", gameId]`, enabled only for valid IDs, `meta:{persist:false}`, no previous/placeholder data, `refetchOnWindowFocus:false`, retry at most once for network/500/504.
10. **Static runtime removed** — No static/preseason/persisted/placeholder/previous-game fallback can render during loading, failure, or success.
11. **Canonical teams** — Team identity from the payload (`game.away_team`/`game.home_team`); URL `a`/`b` display-only.
12. **Controlled states** — No-game directs to Slate; malformed ID; 400/401/403/404/409/500/504; unavailable; invalid-response; safe copy with no raw backend detail.
13. **Readiness disclosure** — Six readiness rows in frozen order; partial keeps renormalized score (no zero-fill), global notice, side-specific Lens Explorer/Detail notes.
14. **League suppression** — `league_context.mode === "suppressed"` enforced via presentation guards only; standings/ranks/ordinals hidden.
15. **Warnings preserved** — `coverage.warnings` adapted as structured `{code, message, ...}` data; safe messages for presentation; no adapter details in browser logs.
16. **Console hygiene** — Detailed contract-violation text removed from browser logging; page shows the generic unreadable-response state on adapter rejection.
17. **Five contested mismatches** — Resolved: no-game copy, 403 access-denied copy, invalid-response state without partial scoring, retry scoped to current game, uneven-evidence wording names affected team/lens without implying zero.
18. **Obsolete tests removed** — "a non-league percentile basis" and "an uncorrected polarity" (fields invented by the earlier transcription, not in the frozen contract); replaced by frozen-method regression and negative tests.
19. **Test results** — Adapter suite 42/42; live-page suite 13/13; full frontend suite 160/160 across 11 files; typecheck clean; production build successful in 9.9 seconds with only the pre-existing chunk-size advisory.
20. **Authenticated DET/BUF acceptance — PASS** in authenticated Lovable preview (`/matchup-lens?a=DET&b=BUF&view=overview&game=20260917_DET%40BUF`):
    - HTTP 200 accepted by the frontend; scored UI rendered; prior unreadable-response state gone.
    - `schema_version` `matchup_lens_v1`; `available:true`, `reason:null`.
    - Canonical DET (ID "11") and BUF (ID "4").
    - Dates `2026-09-14` (as-of) / `2026-09-13` (source data).
    - Coverage 63 / 62 / 63 / 62 (catalog / DET / BUF / shared).
    - Six readiness rows in frozen order; DET Drive Control partial missing `fourth_down_pct`; BUF Drive Control complete.
    - 16 context metrics transported and excluded from scoring (47 definitions scored).
    - Warnings present (asymmetric, partial, league-suppression); league context suppressed.
    - No `numerator` or `denominator` anywhere.
    - No static/preseason evidence rendered; no Matchup Lens API/adapter/query/auth/render console error. The repeated Lovable preview-shell `postMessage` target-origin output is recorded as unrelated preview-environment noise.
21. **Publication state** — Nothing published; nothing deployed; captured production payload and authentication material never committed.

## Verdict
Phase G3 is **complete and accepted**: implemented locally, verified in authenticated preview, with production publication and deployment deliberately not performed.

## Next dependency
Christian's decision on when/how to publish the production frontend — Phase G3 has no remaining technical blocker.
