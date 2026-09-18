# Combined Pass 3C — finishing correction

Baseline source: `d2ad12606363c9c6ac8bdebbfa599a941c803104` (the currently loaded tree is source-identical). Nothing will be published.

## Header layout and route scope

- Update `src/components/AppShell.tsx` only for the exact `/matchup-lens` pathname.
- On that route, use three balanced header regions: logo plus desktop Matchups navigation on the left, a mathematically centered `Lab` title in the middle, and the existing Help/theme/account controls on the right.
- Make the centered title the route’s sole `h1` and an accessible link labelled `Return to Matchup Lab overview`.
- Keep the compact header height and prevent wrapping, clipping, or overlap at desktop and approximately 390px.
- On `/`, `/matchup/:id`, `/settings`, `/admin/claim-health`, `/login`, and unknown paths, render the existing standard header layout without a center slot or altered spacing.

## Canonical Overview return

- Reuse `buildMatchupLensHref` from `src/lib/matchup-lens-link.ts` with the current canonical `game`, `a`, and `b` query values.
- The Lab link will produce only `a`, `b`, `view=overview`, and `game`, thereby dropping child-only or stale state including `lens`, `from`/origin, `layout`, `trace`, legacy `mode`, and `collision`.
- Preserve the GameLens logo and Matchups destinations unchanged.

## Entry-point naming and final-game access

- In `src/pages/Slate.tsx`, replace the hand-built Matchup Lens URL with the existing canonical helper and label each action from its existing game status.
- In `src/pages/Matchup.tsx`, keep the existing canonical link and change only its user-facing label.
- Add one small shared status-label helper in `src/lib/matchup-lens-link.ts`: final statuses use `Review in Matchup Lab`; scheduled and live statuses use `Open in Matchup Lab`.
- Both current entry points already render regardless of status. Keep that behavior so final games remain accessible; do not add preflight data checks or alter the destination page’s existing unavailable/error behavior.

## Expected files

Application:
- `src/components/AppShell.tsx`
- `src/lib/matchup-lens-link.ts`
- `src/pages/Slate.tsx`
- `src/pages/Matchup.tsx`

Directly affected tests:
- `src/test/app-shell-navigation.test.tsx`
- `src/test/matchup-page-navigation.test.ts`
- Add focused entry-point rendering coverage only if needed to prove both scheduled/live and final labels remain linked.

## Verification

Focused tests will confirm:
- `Lab` appears exactly once and only for exact `/matchup-lens` routes.
- Matchups, game details, Settings, Admin, Login, and unrelated routes retain the standard header with no empty center region.
- The Lab link is the sole `h1`, has the requested accessible label, and returns each child-view URL to the same game’s canonical Overview while removing child state.
- The GameLens logo and Matchups links retain `/`.
- Scheduled/live actions read `Open in Matchup Lab`; final and Final/OT actions read `Review in Matchup Lab`; all keep the same canonical game identity and remain actionable.
- No old `Open in Matchup Lens` or `Open Matchup Lens` user-facing strings remain.

Then run the complete test suite with exact totals, TypeScript typecheck, production build, and desktop/mobile browser checks when authentication permits. The desktop check will confirm the title’s center against the full header width; the 390px check will confirm no collision, clipping, or wrapping.

## Boundaries

No changes to game-status calculations, formulas, scores, evidence, warnings, canonical data handling, URL contracts, authentication, API host, backend systems, retries, or no-static-fallback protections. Pass 4 will not begin. Nothing will be published or deployed.
