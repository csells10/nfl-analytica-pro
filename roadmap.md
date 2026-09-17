# Roadmap — Phase G3: live Matchup Lens integration

- [ ] Verify API base against released `/game/<id>/lens-context`; keep or update the single `API_BASE`
- [ ] Add `src/lib/matchup-lens-api-types.ts` from the full frozen contract (not only the DET/BUF success shape)
- [ ] Add `src/lib/matchup-lens-adapter.ts` with full available-response invariant validation
- [ ] Add authenticated fetch + `["matchup-lens-context", gameId]` query (`meta.persist:false`, retry only network/500/504)
- [ ] Remove static/preseason runtime path from the production page
- [ ] Controlled states: no game, malformed, 400/401/403/404/409/500/504, unavailable, invalid response
- [ ] Readiness disclosure (context bar + Lens Explorer/Detail)
- [ ] League-context suppression via presentation guards only
- [ ] Tests: new adapter + live-page suites; migrate only obsolete static/rank assertions, record each
- [ ] Authenticated DET/BUF acceptance verification (no token exposure)
- [ ] Return 21-item evidence packet; do not publish
