# Phase G3 — Connect Matchup Lens to the live production endpoint

Source re-verified against the G1 report before planning: no material drift. `LENSES` order, tags and exclusions are unchanged; `MatchupLens.tsx` still queries `["lens-snapshot", source.id]` from `getLensSnapshotSource()`; `staticLensSnapshotSource` is still the module default; the `game` URL parameter is still read by nobody.

## What this does

The Matchup Lens page stops using the frozen August preseason data entirely. It loads real evidence for the exact game opened from the Slate, from the authenticated production service, and shows honest states when that evidence is missing, incomplete or blocked.

## Work

### 1. Verify the API base first
Call the released endpoint for `20260917_DET@BUF` through the existing Firebase bearer mechanism, first against the current hardcoded base, then against the released base. Keep the single shared `API_BASE` if it already reaches the released service; otherwise update that one constant. No second base, no env-var system, no token printed or stored.

### 2. Transport types — `src/lib/matchup-lens-api-types.ts` (new)
Exact TypeScript for the `matchup_lens_v1` envelope: schema version, availability + safe reason, canonical game header, display strings, basis/freshness, dynamic metric catalog, away/home evidence, coverage totals, six ordered readiness rows, named-metric coverage, warnings, league context, method. Every envelope key required; nullability mirrors the contract. Transport signal strength is `"strong" | "supporting" | "context"`. No `numerator`/`denominator`. The frontend `SignalStrength` is not widened. Field names are transcribed from the real authenticated response captured in step 1.

### 3. Pure adapter — `src/lib/matchup-lens-adapter.ts` (new)
`adaptMatchupLensV1(payload) => { snapshot, game, basis, coverage, leagueContext, method }`, synchronous and side-effect free. Validates schema version, availability, canonical header, team-ID conversion to safe integers, metric record key vs nested `.metric`, signal-strength values, and percentile finiteness/range. `context` metrics are dropped from definitions and from every percentile record, never coerced. Null percentiles omit the key; numeric zero is kept. Tags and labels pass through byte-for-byte. Any contract violation throws a typed adapter error — never a partial snapshot. `LensSnapshot` is unchanged; readiness/warnings/league context ride alongside it.

### 4. Live request + query
`fetchMatchupLensContext(gameId)` added to `src/lib/nfl-api.ts`, reusing `authHeaders()` and the existing safe error mapping, extended with typed 400/404/409/504 kinds. Game IDs are validated against `^[0-9]{8}_[A-Z0-9]{2,4}@[A-Z0-9]{2,4}$`, max 32 chars.

Query: key `["matchup-lens-context", gameId]`, `meta: { persist: false }`, enabled only for a valid ID, no `keepPreviousData`, no placeholder or initial data, `refetchOnWindowFocus: false`, one retry only for network/500/504.

### 5. Remove the static runtime path
`MatchupLens.tsx` no longer imports or calls `getLensSnapshotSource()`. The `game` parameter becomes the evidence identity; `a`/`b` become display-only and are normalized (`replace`) to the canonical response abbreviations after success. The LAR/CLE defaults are removed from the live page. The static snapshot and source files stay on disk untouched for tests; a test asserts the page module has no import path back to them.

### 6. States — `DashboardStates.tsx`
Add controlled states for: no game, malformed game, unknown game (404), unavailable (`available:false`, showing the safe backend reason), access denied (403), invalid/unsafe evidence (409), invalid response, timeout (504), and generic failure with manual retry. All plain language; no raw bodies, stack traces or internal detail.

### 7. Readiness disclosure
One concise partial/asymmetric notice in the Matchup Context bar; side-specific readiness and missing-evidence detail in Lens Explorer and Lens Detail for the affected lens only. `unavailable` lenses show no head-to-head comparison. Scores, denominators, Collision and Turnover Watch rules are untouched — DET Drive Control stays calculable from its surviving metrics and the missing `fourth_down_pct` never becomes zero.

### 8. League-context suppression
Driven by `league_context.mode === "suppressed"`, passed down as a presentation flag. Hides League Standing, lens and metric ordinals, every "out of N" phrase, rank-dependent brief observations, rank identity ticker stories and rank-dependent trace text; keeps scores, gaps, Biggest Edge, non-rank trace evidence and all navigation. `matchup-lens-rank.ts` is not modified.

### 9. Tests
New adapter and live-page suites covering all 28 required points, plus a full run of the existing suites.

## Known conflict to resolve during implementation

Four existing page-level suites (`matchup-lens-page`, `-presentations`, `-continuity`, `-journey`) render the page with no `game` parameter and expect the static snapshot. Once the page is live-only they would land on the no-game state. They will be migrated to mount with a valid `game` and a mocked live response of equivalent evidence — same assertions, same expected values, nothing weakened. If any assertion cannot be preserved that way, I will stop and report it rather than relax it.

## Stop condition

Implement, verify against the real DET/BUF response, run the full suite, and return the 21-item evidence packet. Nothing published or deployed.
