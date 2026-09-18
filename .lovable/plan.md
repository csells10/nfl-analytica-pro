# Matchup Lab loading experience

## Goal

Replace the current pulsing dashboard skeleton with a calm, matchup-specific loading screen. Keep the URL useful only for temporary team identity while the authenticated response remains the sole source of evidence, scores, analysis, canonical teams, warnings, and availability state.

## Loading screen

When both `a` and `b` URL values resolve to known NFL teams:

- Show the away and home logos and full team names in a clear `Away at Home` composition.
- Show **Preparing Matchup Lab**.
- Show **Loading live evidence for this game…**.
- Treat this identity as temporary display context only; do not pass it into calculations or retain it after the response resolves.

When either URL team is absent or unrecognized:

- Show the neutral fallback **Loading matchup evidence…**.
- Do not render guessed logos, fallback abbreviations, or invented team names.

The loading view will be responsive, use the existing slate/graphite and muted-teal tokens, and expose a polite loading status to assistive technology.

## Motion direction

### Recommended: Quiet matchup reveal

Render the matchup lockup fully composed and still. On arrival, use one short opacity fade for the whole loading view. When live evidence resolves, replace it with one short opacity fade for the completed Lab. Under reduced-motion preferences, both transitions become immediate.

This is the recommended implementation because it is calm, readable, and closest to the explicit no-repeated-motion requirement.

### Three professional alternatives

1. **Broadcast introductions** — the two team groups fade once with a very small inward movement, then remain completely still. The completed Lab uses the same brief fade.
2. **Evidence line** — team identity appears immediately while a thin, solid divider draws once between away and home; no glow or gradient. The completed Lab then fades in once.
3. **Focus settle** — the complete matchup lockup enters once at slightly reduced opacity and scale, settles in under 250ms, and remains static until the completed Lab fades in.

All four directions prohibit pulsing, shimmer, bounce, spin, sweeping gradients, looping indicators, and changing loading phrases. Approval of this plan selects **Quiet matchup reveal** unless Christian requests one of the alternatives.

## Implementation

- Replace the Lab-only `DashboardSkeleton` with a focused loading component in the existing dashboard-state module.
- Add an explicit known-team lookup so only registry-backed abbreviations qualify for the matchup display; preserve the existing general-purpose team fallback everywhere else.
- Build temporary loading identity only from the existing Lab URL parameters. The game id and authenticated request flow remain unchanged.
- Swap the loading branch in `MatchupLens` to the new view and add the brief completion entrance without delaying, caching, or transforming live evidence.
- Leave the separate Game Details loading experience unchanged.

## Safeguards

- No evidence, score, analysis, readiness message, or backend-derived claim appears during loading.
- The backend payload continues to replace URL identity and remains canonical after loading.
- No static or prior-game fallback is introduced.
- Authentication, endpoint, API base, request key, validation, retry behavior, controlled errors, unavailable handling, guide timing, and scoring/presentation formulas remain unchanged.
- Collision, Technical Map, Run Visibility, and removed navigation remain absent.

## Verification

Add focused tests proving:

- recognized URL teams show both correct full names, logos, and the away-at-home relationship while the request is pending;
- missing or unrecognized URL identity shows only **Loading matchup evidence…**;
- no evidence, scores, analysis, or preseason/static content appears before the authenticated response resolves;
- the backend response still supplies canonical team identity even when URL teams differ;
- the old pulsing skeleton and prohibited repeating-motion classes are absent from the Lab loading path;
- reduced-motion users receive an immediate transition;
- existing success, unavailable, error, retry, and first-visit-guide behavior still works.

Then run the focused tests, full test suite, typecheck, and production build. Verify desktop and mobile layouts where authentication access permits. Do not publish or deploy, and do not begin Pass 5.
