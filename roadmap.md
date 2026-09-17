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
- [ ] Authenticated DET/BUF acceptance verification — BLOCKED: app sign-in is Google-only (Firebase); no
      signed-in session or token can be established in this environment
- [x] Return 21-item evidence packet; nothing published
