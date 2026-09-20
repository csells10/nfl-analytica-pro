# Roadmap — Phase G3: live Matchup Lens integration

- [x] Verify API base against released `/game/<id>/lens-context`; keep or update the single `API_BASE`
- [x] Add `src/lib/matchup-lens-api-types.ts` from the full frozen contract (not only the DET/BUF success shape)
- [x] Add `src/lib/matchup-lens-adapter.ts` with full available-response invariant validation
- [x] Add authenticated fetch + `["matchup-lens-context", gameId]` query (`meta.persist:false`, retry only network/500/504)
- [x] Remove static/preseason runtime path from the production page
- [x] Controlled states: no game, malformed, 400/401/403/404/409/500/504, unavailable, invalid response
- [x] Readiness disclosure (context bar + Lens Explorer/Detail)
- [x] League-context suppression via presentation guards only
- [x] Tests: new adapter + live-page suites; migrate only page-level assertions, record each
- [x] Authenticated DET/BUF acceptance verification — PASS in authenticated Lovable preview (user-held session);
      scored UI rendered, no Matchup Lens console error
- [x] Return 21-item evidence packet; item 19 records adapter 42/42, live-page 13/13, full suite 160/160 (11 files),
      clean typecheck, build OK in 9.9s; nothing published or deployed
- [x] Phase G3 CLOSED — pending independent Phase G4 verification (Christian's decision)
- [x] Remove Run Visibility (nav, route, isolated files, tests); verify + no publish
- [x] Pass 1: simplify header/account navigation and selected-game Matchup Lens journey; verified and saved unpublished version
- [x] Pass 2A: remove Collision destination/view while preserving read-only overview observations
- [x] Pass 2B: remove Technical Map and isolated graph layout
- [x] Pass 3: interaction polish without duplicate chart/tile keyboard stops
- [x] Pass 3C: cohesive Lab header, neutral lens choices, and three-card Overview row
- [x] Pass 3C finishing correction: centered Overview-linked Lab header and status-aware Lab entry labels
- [x] Pass 4: versioned guides and clearer empty states
- [x] Matchup Lab: replace the pulsing skeleton with the quiet matchup reveal and verify both entry paths
- [x] Pass 4 finish: contextual Matchup Lab Help and Matchup Briefing Game Details transition
- [x] Pass 5: preserve the Matchups date context (fromDate navigation parameter)
- [ ] Pass 5: complete verification and bookmark unpublished release candidate
- [x] Refine the Matchups-to-Game-Details transition with the restrained handoff, progress rail, reduced-motion treatment, and dated return reveal
- [x] Stabilize the Matchup Briefing chevron, connected rail, stage icons, and sub-420px layout

## Matchup Briefing rail alignment
- [x] Separate the stationary vertical-centering wrapper from the horizontally animated signal carrier.
- [x] Verify rail/node/signal alignment through the animation at desktop, 375px, and 320px.
- [x] Run focused and full verification.

## Simplify Matchup Briefing progress rail
- [x] Remove permanent station nodes and keep one continuous rail with one signal.
- [x] Separate vertical centering, horizontal travel, and dot scale/color animation.
- [x] Verify desktop, 375px, 320px, themes, reduced motion, tests, types, and build.
