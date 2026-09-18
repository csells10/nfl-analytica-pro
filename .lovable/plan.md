# Combined Pass 3C — UI cohesion correction

Baseline: `3de0be7d19dc728404608f7c36edacced32f2839`. Nothing will be published.

## Header and page hierarchy

- Update `src/components/AppShell.tsx` to detect the Matchup Lens route and render one non-interactive `Lab` label beside the existing logo/navigation area, separated subtly so the header reads `GameLens | Lab`.
- Make `Lab` the sole page-level `h1` on this route without turning it into a link, tab, or button.
- Preserve the logo, Matchups navigation, Help, theme control, account-name menu, authorized Admin item, Settings and Sign out.
- Keep the desktop and mobile header on one line without clipping; retain the current compact global-header height.
- Remove the standalone `Matchup Dashboard` heading and purpose line from `src/pages/MatchupLens.tsx`.
- Make the matchup context strip the first page content, with one shared gap between it and every view body.
- Retune `src/components/matchup-lens/MatchupContextBar.tsx` to stick immediately beneath the actual global header: `top-14` on desktop and beneath the two-row mobile header at narrow widths. Preserve matchup identity, canonical teams, season/window, evidence date, current-view label, notices, refresh state and the single Overview action.

## Neutral navigation-choice surfaces

- In `src/pages/MatchupLens.tsx`, make Constellation visual activity derive only from local `activeAxis`; retain URL `selectedLens` for lens details, URLs, navigation and trace behavior.
- In `src/components/matchup-lens/LensConstellation.tsx`, remove `selectedKey` from axis, label and tile styling; remove `aria-pressed`; highlight only `activeKey` from hover, focus or active pointer/tap.
- In `src/components/matchup-lens/LensRadar.tsx`, highlight only `activeKey` and mechanically remove `selectedKey` when unused.
- Keep score tiles as the sole keyboard tab stops, keep SVG targets pointer-only, and preserve chart geometry, scores, lens ordering and click destinations.
- `src/components/matchup-lens/LensExplorer.tsx` remains neutral at rest; it requires no change unless a directly affected test confirms otherwise.

## Three-card Overview row

- In `src/components/matchup-lens/DestinationCards.tsx`, replace the obsolete two/four-column desktop rules with three equal desktop columns.
- Make each card a full-height flex column and keep its Open action consistently aligned at the bottom.
- Preserve the existing narrow-screen carousel behavior, wording, icons, destinations and disabled state.

## Expected files

Application:
- `src/components/AppShell.tsx`
- `src/pages/MatchupLens.tsx`
- `src/components/matchup-lens/MatchupContextBar.tsx`
- `src/components/matchup-lens/LensConstellation.tsx`
- `src/components/matchup-lens/LensRadar.tsx`
- `src/components/matchup-lens/DestinationCards.tsx`

Tests, only where directly affected:
- `src/test/app-shell-navigation.test.tsx`
- `src/test/matchup-lens-page.test.tsx`
- `src/test/matchup-lens-presentations.test.tsx`
- `src/test/matchup-lens.test.tsx` only if its component prop contract changes

## Verification

Focused tests will confirm:
- `Lab` appears exactly once in the global header on Matchup Lens routes, is the single `h1`, and is not interactive.
- Other routes retain the existing header without `Lab`.
- `Matchup Dashboard` and its purpose line no longer appear in the page body.
- The context strip remains the first Matchup Lens content and retains every field/control.
- A retained `lens=` parameter creates no visual selection at rest in overlay or side-by-side Constellation.
- Hover/focus activates exactly one matching axis; leave/blur returns to neutral; SVG targets add no keyboard stop; click still opens the correct lens.
- All Six Lenses remains neutral at rest and navigates normally.
- Exactly three destination cards retain their content/actions and use a three-column desktop row.

Then run:
- complete test suite with exact totals;
- TypeScript typecheck;
- production build;
- desktop (~1280px) and narrow mobile (~390px) browser checks for header/context alignment, spacing, three-card layout and interaction states when authentication permits.

## Boundaries

No changes to formulas, scores, weights, evidence, warnings, canonical teams, dates, URL contracts, authentication, API host, backend systems, retries or no-static-fallback protections. Collision, Technical Map and removed navigation controls stay removed. Pass 4 will not begin, and nothing will be published or deployed.
