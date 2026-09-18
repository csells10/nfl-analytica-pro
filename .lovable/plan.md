# GameLens pre-release refinement plan

## Guardrails and workflow

- Baseline bookmark: `94708d3b3dcc02c6fcb24772b84334a668ff7695` (`Update plan`, saved 2026-09-18 13:50:19 UTC). The product-source removal itself is commit `0cd084c35aac07a9b381a55f739547923dae952c` (`Changes`, saved 2026-09-18 13:49:11 UTC); the current merge commit contains the identical `src/App.tsx` content and the complete Run Visibility deletion, plus plan/roadmap records. The working tree is clean.
- Implement exactly one pass, verify it, report its saved version, then stop for Christian’s review before beginning the next pass.
- Never publish or deploy during these passes.
- Preserve Matchup Lens formulas, scores, weights, tags, exclusions, canonical teams, live contract, dates, warning handling, authentication, `API_BASE`, backend systems, retry behavior, and no-static-fallback protections.
- Collision-derived overview observations will remain as read-only insights after the Collision destination is removed. Their shared calculations remain unchanged.

## Pass 0 — read-only inspection (complete)

### 1. Saved baseline

- Current immutable saved version: `94708d3b3dcc02c6fcb24772b84334a668ff7695`.
- Run Visibility source-removal commit within that saved version: `0cd084c35aac07a9b381a55f739547923dae952c`.
- No unsaved edits are present. This pair is the rollback/audit bookmark for the upcoming passes.

### 2. Header and account controls

- `src/components/AppShell.tsx` owns the logo, desktop and mobile primary navigation, visible email, Help, theme, sign-out control, and admin visibility lookup.
- `src/contexts/AuthContext.tsx` owns the authenticated user shape and Firebase-to-app user mapping.
- `src/components/ui/dropdown-menu.tsx` is the existing accessible menu primitive to use; no new menu dependency is needed.
- `/settings` and `/admin/claim-health` remain routed in `src/App.tsx`; they move into the account menu rather than being removed.

### 3–4. Display name source and fallback

- Firebase `FirebaseUser.displayName` is mapped to `user.name` in `AuthContext.tsx`.
- Existing fallback is the email local part: `fbUser.displayName ?? (fbUser.email ?? "").split("@")[0]`.
- Pass 1 will render `user.name`, with the same email-local-part fallback defensively retained if a test or incomplete session supplies no `name`. It will not change authentication behavior or persist editable profile data.

### 5. Existing guides and persistence

- `AppShell.tsx` dispatches `gamelens:open-guide`; its discovery pulse uses `gamelens_guide_hint_views` for the first three shell mounts.
- `Slate.tsx` opens `DateSelectionModal.tsx` on first visit using unversioned key `hasSeenDateTutorial`; Help reopens it through the global event.
- `Matchup.tsx` opens `SectionSpotlightTour.tsx` on first visit using unversioned key `hasSeenMatchupSectionSpotlightTour`; Help reopens it through the same event.
- `SectionGuide.tsx` has per-section keys (`hasSeenMatchupSectionGuide:*`) but is disabled in `Matchup.tsx`; it is not part of the new Matchup Lens guide.
- `MatchupLens.tsx` currently passes `showGuide={false}` and has no page guide.

### 6. Game-detail insertion point

- `src/pages/Matchup.tsx`, inside `MatchupContent`, header metadata row at lines 1517–1536: the game ID, canonical away/home abbreviations, date/status, and ESPN action are already present there.
- Add “Open Matchup Lens” in that row, targeting `/matchup-lens?a=<away>&b=<home>&view=overview&game=<encoded game id>`. This preserves the existing live game identity and canonical-response handling.
- The existing Slate-card “Open in Matchup Lens” action remains because it is already scoped to a selected game.

### 7. Change-matchup and duplicate return controls

- One Change matchup control exists: `MatchupContextBar.tsx` (`context-change-matchup`), wired by `MatchupLens.tsx` to `/`.
- Every focused view currently renders two return controls simultaneously:
  - sticky `MatchupContextBar.tsx` `context-back`, always returning to Overview;
  - `JourneyNav.tsx` `journey-back`, returning to the recorded origin.
- Pass 1 removes Change matchup and the contextual Journey back button, retaining the sticky Overview action as the single consistent child-view return. The lens selector and previous/next lens controls remain.

### 8. Collision inventory

- Collision is URL view state, not a React Router route: `view=collision` and optional `collision=` are parsed/written in `MatchupLens.tsx` and `matchup-lens-view.ts`.
- Entry points: overview destination card, ticker collision story, Game Brief collision observation, Continue Exploring, and direct/legacy URLs.
- UI: `src/components/matchup-lens/MatchupCollision.tsx`.
- Shared calculations: `src/lib/matchup-lens-collision.ts`, consumed by overview brief/story generation as well as the removable view. This file must remain.
- Related tests: `matchup-lens-page.test.tsx`, `matchup-lens-presentations.test.tsx`, `matchup-lens-continuity.test.tsx`, and the pure collision coverage in `matchup-lens-new-features.test.tsx`.
- After removal, stale/direct collision URLs normalize to Overview with `replace`; collision-derived overview text remains visible but non-clickable.

### 9. Technical Map inventory

- Entry points: “Open technical map” in `LensDetail.tsx`; “Technical map” disclosure and Network/Packed controls in `TraceDrawer.tsx`.
- UI: lazy `TraceGraphs.tsx` renders network and packed SVGs.
- Isolated layout calculations: `src/lib/matchup-lens-trace-graph.ts` (`buildTraceGraph`, `buildPackedGroups`).
- The normal trace drawer/list depends on `matchup-lens-trace.ts`, `TraceChips.tsx`, and rank/presentation helpers; these are shared and must remain.
- Tests asserting the technical disclosure are in `matchup-lens-new-features.test.tsx`; overview absence assertions are in `matchup-lens-page.test.tsx`.

### 10. Evidence overflow

- `EvidenceRail.tsx` is a horizontal scroll-snap strip: about one card plus a partial card on mobile and three cards on desktop.
- Both arrow buttons always render and nudge a fixed 240px even when no overflow exists or an edge has been reached; there is no measured overflow state.
- `LensDetail.tsx` initially passes three key rows, then all rows. Current labels are `View all evidence (<total>)` and `Show key evidence only`.

### 11. Constellation interaction

- Overlay SVG axis hit circles support mouse hover and click/tap, but are not keyboard-focusable.
- Score tiles support hover, keyboard focus, click, and tap.
- Side-by-side `LensRadar.tsx` SVG axes support click/tap only.
- `MatchupLens.tsx` stores hover state, but `LensConstellation` currently receives only `selectedLens` for axis styling, so hover does not consistently highlight the chart axis.

### 12. Exact pass file boundaries

#### Pass 1 — Navigation and journey

Modify:
- `src/components/AppShell.tsx`
- `src/pages/Matchup.tsx`
- `src/pages/MatchupLens.tsx`
- `src/components/matchup-lens/MatchupContextBar.tsx`
- `src/components/matchup-lens/JourneyNav.tsx`
- `src/test/matchup-lens-journey.test.tsx`
- `src/test/matchup-lens-continuity.test.tsx`
- `src/test/matchup-lens-page.test.tsx`

Add focused coverage:
- `src/test/app-shell-navigation.test.tsx`
- `src/test/matchup-page-navigation.test.tsx`

Implementation:
- Logo remains linked to `/`; rename the sole primary item to Matchups.
- Remove Matchup Lens, Settings, and Admin from desktop/mobile primary navigation.
- Replace visible email and standalone sign-out icon with an accessible display-name menu using the existing dropdown primitive; Settings always appears, Admin appears only when `me?.is_admin`, and Sign out calls the existing auth function.
- Use the semantic `primary` accent for the trigger, with normal focus/contrast states.
- Keep Help and theme controls visible.
- Add the selected-game Matchup Lens action to game details.
- Remove Change matchup and duplicate contextual Back controls; keep one sticky Overview action on child views and preserve lens stepping.

#### Pass 2A — Collision destination and view removal

Modify:
- `src/pages/MatchupLens.tsx`
- `src/components/matchup-lens/DestinationCards.tsx`
- `src/components/matchup-lens/GameBrief.tsx`
- `src/components/matchup-lens/InsightTicker.tsx`
- `src/lib/matchup-lens-view.ts`
- `src/lib/matchup-lens-brief.ts`
- `src/lib/matchup-lens-stories.ts`
- `src/test/matchup-lens-page.test.tsx`
- `src/test/matchup-lens-presentations.test.tsx`
- `src/test/matchup-lens-continuity.test.tsx`
- `src/test/matchup-lens-journey.test.tsx`
- `src/test/matchup-lens-new-features.test.tsx`

Delete only isolated UI/layout code:
- `src/components/matchup-lens/MatchupCollision.tsx`

Implementation:
- Retain only Compare, Biggest Edge, and All Six Lenses destinations.
- Remove collision view/origin/query handling and normalize stale collision URLs to Overview with replace.
- Keep `matchup-lens-collision.ts` unchanged for overview calculations; render its brief/ticker observations as read-only rows without a dead action.

Save and verify Pass 2A independently before continuing.

#### Pass 2B — Technical Map removal

Modify:
- `src/components/matchup-lens/LensDetail.tsx`
- `src/components/matchup-lens/TraceDrawer.tsx`
- `src/test/matchup-lens-page.test.tsx`
- `src/test/matchup-lens-new-features.test.tsx`

Delete only isolated graph UI/layout code:
- `src/components/matchup-lens/TraceGraphs.tsx`
- `src/lib/matchup-lens-trace-graph.ts`

Implementation:
- Remove Technical Map entry points, visual modes, lazy graph UI, and isolated graph layout helper; retain the useful list-based trace drawer and all scoring/trace relationships.
- Save and verify Pass 2B independently before continuing.

#### Pass 3 — Interaction polish

Modify:
- `src/pages/MatchupLens.tsx`
- `src/components/matchup-lens/LensConstellation.tsx`
- `src/components/matchup-lens/LensRadar.tsx`
- `src/components/matchup-lens/EvidenceRail.tsx`
- `src/components/matchup-lens/LensDetail.tsx`
- `src/components/matchup-lens/LensExplorer.tsx`
- `src/test/matchup-lens.test.tsx`
- `src/test/matchup-lens-presentations.test.tsx`
- `src/test/matchup-lens-page.test.tsx`

Implementation:
- Use one active-axis state for hover, keyboard focus, click, and tap. Keep score tiles as the primary keyboard-accessible controls; equivalent SVG/chart targets support pointer and tap without creating duplicate tab stops.
- Measure the evidence rail on mount, resize, content expansion, and scroll; show arrows only when overflow exists and disable/hide the direction that cannot move.
- Change expansion copy to `Show N more` and `Show key evidence only`.
- Give the selected All Six Lenses tile a semantic primary/accent state rather than the current gray secondary state.

#### Pass 4 — Guidance and empty states

Modify:
- `src/components/AppShell.tsx`
- `src/pages/Slate.tsx`
- `src/components/DateSelectionModal.tsx`
- `src/pages/MatchupLens.tsx`
- `src/components/SectionSpotlightTour.tsx` only if a small reusable accessibility/generalization adjustment is required
- `src/components/matchup-lens/DashboardStates.tsx`
- `src/test/matchup-lens-live-page.test.tsx`

Add focused coverage:
- `src/test/guide-persistence.test.tsx`

Implementation:
- Replace unversioned Matchups onboarding persistence with a versioned local-only key and preserve Help reopening.
- Add a first-Matchup-Lens-visit tour, also with a separate versioned local-only key; expose Help on that page and target existing orientation elements without changing scoring or layout.
- Keep the existing game-detail tour behavior intact unless the shared tour component requires a compatibility-only adjustment.
- Clarify the no-game state so it directs the user to choose a scheduled matchup.
- Do not add previous/next *game-day* actions: the current schedule response contains only the selected date’s games and does not identify adjacent scheduled game days. The existing calendar already queries arbitrary dates; guessing adjacent game days would violate the bounded/no-new-backend requirement.

#### Pass 5 — Verification and unpublished release candidate

No planned product-source edits. If verification exposes a defect, stop and propose a bounded corrective pass rather than silently changing source.

For each implemented pass:
- Run the focused affected tests, then the complete remaining suite with exact totals.
- Run TypeScript typecheck and production build; report the existing chunk advisory separately from failures.
- Verify desktop at 1280px and narrow mobile, including keyboard focus where applicable.
- Report exact changed/deleted files, behavior evidence, unresolved issues, and the newly saved immutable version.

Final Pass 5 checks:
- Verify signed-out protection plus normal authenticated Matchups → game details → Matchup Lens journey when an authenticated session is available; otherwise name that blocker without changing auth.
- Reconfirm no forbidden source/config/backend changes and no static/prior-game evidence.
- Record the final immutable saved version as the unpublished release candidate, explicitly separated from the Run Visibility baseline bookmark.
- Confirm nothing was published or deployed.
