# Stabilize the Matchup Briefing animation

## Outcome

Keep the existing Matchup Briefing, request-driven lifecycle, return behavior, and exact motion palette while making the handoff and three-stage sequence clearer and visually anchored.

- One plainly visible central chevron.
- One continuous muted rail with three fixed station nodes.
- One traveling signal on the rail.
- Three restrained, fixed-size stage icons.
- No animated card geometry, borders, gaps, or layout.

## Current presentation to correct

The briefing currently uses an 8px CSS-border chevron, a rail shown at 45% opacity, and three independently animated stage underlines. The rail sits above a stage layout that changes from three columns to a vertical stack on mobile, so the visual relationship is less direct there.

## Implementation

### 1. Central handoff

Update `MatchupAnalyzing` to use the existing Lucide `ChevronDown` icon at 18px.

- Keep one fixed-height handoff region between the date and “Preparing game analysis.”
- Keep the thin central line, one downward teal signal, and the existing small one-shot landing ripple.
- Give the chevron a muted-rail resting color and a brief one-shot color transition to analysis teal when the downward signal reaches it.
- Reserve fixed space for the line, signal, ripple, and chevron so the area never shifts.
- Keep the chevron visible in both themes and under reduced motion.
- Do not add any directional cue above the individual stages.

### 2. Stable connected progress rail

Replace the faint/disconnected treatment with one continuously visible muted-rail track.

- Use a fixed three-column geometry for the rail stations and stage cards so each node aligns with its card.
- Keep the three fixed nodes visible at all times; use the existing teal, blue, and violet motion tokens for their restrained station identity.
- Animate only one small signal across the fixed rail using transform and opacity.
- Remove the three independently animated stage underlines and their keyframes.
- Keep every card at a constant 1px border width and fixed reserved internal slots; normal animation will not resize or reposition cards, labels, icons, nodes, or borders.
- On narrow screens, use equal-width compact columns with wrapping labels and fixed minimum geometry so the row remains aligned without horizontal overflow or uneven compression.

### 3. Stage icons

Add existing Lucide icons without a dependency change:

- Game Profile: `FileText`, analysis teal.
- Core Areas: `Radar`, signal blue.
- Team Comparison: `Scale`, lens violet.

Each icon will be 16px in a fixed-width slot. Existing stage numbers and labels remain, labels continue using accessible foreground tokens, and icons never move, rotate, bounce, or resize.

### 4. Reduced motion

Under `prefers-reduced-motion: reduce`:

- Disable the downward signal, ripple, rail signal, entrance settle, logo settle, and chevron color animation.
- Keep the muted central line, muted chevron, complete rail, all three nodes, and all three icons visible immediately.
- Apply one static active treatment to Game Profile without changing border width or geometry.

### 5. Lifecycle boundaries

No changes to `Matchup.tsx`, `Slate.tsx`, navigation, or data code are expected.

The existing `isColdLoad = isLoading && !data` branch remains the only trigger. Authenticated data still replaces the briefing immediately, canonical backend identity still wins, and neutral/error/cached/return/date behavior remains unchanged. No artificial delay will be introduced.

## Expected files

- `src/components/MatchupAnalyzing.tsx` — visible Lucide chevron, fixed rail/stations, stable cards, and stage icons.
- `tailwind.config.ts` — chevron color timing, transform-based rail motion, and removal of obsolete stage-underline animations.
- `src/test/game-details-loading.test.tsx` — fixed structure, one rail signal, icons, reduced-motion hooks, and prohibited-motion assertions.

Other files will change only if verification identifies a directly related test expectation.

## Verification

1. Run focused briefing, route-loading, navigation, and date-preservation tests.
2. Run the full test suite, TypeScript check, and production build.
3. Use browser checks at desktop and mobile widths in light and dark themes to confirm:
   - the 18px chevron is plainly visible;
   - the track reads as one connected rail with three aligned nodes;
   - exactly one signal travels along the rail;
   - cards, icons, labels, nodes, borders, and reserved spaces do not shift or resize;
   - icons remain legible without competing with labels;
   - no mobile overflow or uneven compression;
   - reduced-motion mode is fully static, with the chevron, rail, nodes, icons, and one active treatment visible;
   - fast responses remain immediate and slow responses keep the calm rail signal.
4. Confirm nothing is published or deployed.
