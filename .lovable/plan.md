# Simplify the Matchup Briefing progress rail

## Outcome

Keep one continuous muted rail and exactly one solid signal. Remove all permanent station circles while preserving the briefing cards, central handoff, loading lifecycle, navigation, and responsive geometry.

## Implementation

- In `MatchupAnalyzing`, remove the three fixed node elements.
- Keep the rail positioned from the center of the first card to the center of the third card using the same three-column gap geometry.
- Use three nested signal layers:
  1. a stationary outer wrapper owns `top: 50%` and vertical centering;
  2. a position wrapper owns horizontal travel only;
  3. a 6px dot owns color and gentle scale up to approximately 8px only.
- Keep overflow contained without clipping the dot at either endpoint.
- Under reduced motion, stop travel and scale while leaving one normal 6px teal signal at Game Profile.
- Split the existing combined keyframes into horizontal-position and dot-style animations; preserve the exact teal, blue, violet, and muted-rail tokens.

## Verification

- Update the focused loading test to assert no station circles, exactly one signal, separated animation responsibilities, and static reduced-motion behavior.
- Measure rail and dot centers throughout the complete cycle at desktop, 375px, and 320px in light and dark modes.
- Confirm no layout movement or horizontal overflow and verify reduced motion is static.
- Run the focused test, full suite, type check, and production build.
- Do not publish or deploy.
