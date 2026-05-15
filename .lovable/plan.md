## v1.8.0 — Spotlight Tour as the only onboarding

Goal: First-time visitors automatically get the Section Spotlight Tour. Returning users can re-open it any time from the header `?` button. Remove the QA variant switcher and all other intro variants from the rendered UI (keeping only the spotlight code path).

### Behavior

- First time on a Matchup page → Spotlight Tour opens automatically (gated by `localStorage["hasSeenMatchupSectionSpotlightTour"]`).
- After completing or closing the tour → never auto-opens again.
- Header `?` button (already present in `AppShell`, dispatches `gamelens:open-guide`) → always force-opens the tour, regardless of the "seen" flag.
- The "Intro QA" toolbar above the back button is removed.

### Files changed

1. **`src/pages/Matchup.tsx`**
   - Remove imports: `MatchupIntroDialog`, `isSectionGuidedVariant`, `isSectionSpotlightVariant`, `MatchupIntroQASelector`.
   - Keep: `SECTION_SPOTLIGHT_TOUR_SEEN_KEY`, `SectionSpotlightTour`, `SpotlightTourStep`.
   - Remove `<MatchupIntroDialog />` and `<MatchupIntroQASelector />` from the render tree.
   - Replace the variant-gated tour effect with:
     - On mount: if `localStorage[SECTION_SPOTLIGHT_TOUR_SEEN_KEY] !== "true"` → `setTourOpen(true)`.
     - Listen for `gamelens:open-guide` window event → always `setTourOpen(true)` (does not check or clear the seen flag — re-opening from `?` is a manual replay).
     - Drop the `gamelens:matchup-intro-reopen` listener.
   - `markTourSeenAndClose` unchanged.

2. **`src/components/AppShell.tsx`**
   - No code change required. `openGuideTutorial()` already dispatches `gamelens:open-guide`; Matchup will now listen.
   - The `?` button stays visible on every route; on non-Matchup routes the event has no listener and is a no-op (acceptable — the tour only makes sense on a matchup page).

3. **Deletions**
   - Delete `src/components/MatchupIntroQASelector.tsx`.
   - Delete `src/components/MatchupIntroDialog.tsx` (no longer imported anywhere after step 1).
   - Note: `MatchupIntroDialog.tsx` also calls `clearAllSectionGuideDismissals` from `SectionGuide`. `SectionGuide` itself stays (still imported by `Matchup.tsx`); only the dialog file is removed.

### Out of scope (unchanged)

Backend logic, data fetching, Matchup Lean, Model Trust, Game Profile, Core Area Advantage, Final Score, Team Comparison badge/accent, routing, `nfl-api.ts`, `SectionSpotlightTour.tsx` itself, the `?` button styling/pulse logic in `AppShell`.

### QA

- Fresh browser (clear `localStorage`) → load `/matchup/20260111_LAC@NE` → tour auto-opens at Game Profile.
- Finish or X the tour → reload → no auto-open.
- Click header `?` → tour re-opens from step 1.
- Verify Intro QA toolbar is gone above the "Back to games" button.
- Mobile viewport ≤414px and dark theme: spotlight ring + card placement still correct (no changes to tour component).
- Click `?` on `/` (Slate) or `/settings` → no error in console (event has no listener).
