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
- [ ] Pass 2A: remove Collision destination/view while preserving read-only overview observations
- [ ] Pass 2B: remove Technical Map and isolated graph layout
- [ ] Pass 3: interaction polish without duplicate chart/tile keyboard stops
- [ ] Pass 3C: cohesive Lab header, neutral lens choices, and three-card Overview row
- [ ] Pass 4: versioned guides and clearer empty states
- [ ] Pass 5: complete verification and bookmark unpublished release candidate
