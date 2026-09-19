# Refine the Matchups → Matchup transition

## Outcome

Keep the existing Matchup Briefing card and data flow, while adding the selected restrained motion language:

- one central downward handoff from matchup identity into analysis;
- one calm horizontal signal moving across Game Profile, Core Areas, and Team Comparison;
- a short content reveal when authenticated matchup data arrives;
- a restrained return reveal on the original dated Matchups slate.

No backend, request, cache, canonical-team, error, navigation, or date-preservation behavior changes.

## Implementation

### 1. Theme-aware motion palette

Add semantic motion tokens for analysis teal, signal blue, lens violet, and the muted rail in both light and dark themes. Expose them through the existing Tailwind color configuration.

- Components will use token classes rather than hard-coded surface colors.
- Existing `background`, `card`, `foreground`, and `border` tokens continue to provide the light/dark surfaces.
- Bright accents remain decorative only; labels retain existing accessible foreground colors.

### 2. Matchup Briefing motion

Update `MatchupAnalyzing` without changing its card width, matchup structure, labels, or internal card padding.

- Entrance: opacity `0 → 1` plus an approximately 8px upward settle over about 200ms.
- Team logos: optional single 8px inward settle, kept subtle and non-repeating.
- Central handoff: one thin line beneath the date with a small teal signal traveling downward, followed by one quick low-opacity ripple at the analysis boundary.
- Progress rail: one thin rail visually spanning the three existing stage items. A small signal travels calmly from teal to blue to violet; the reached stage receives a temporary 1px border or underline treatment.
- The rail is explicitly indeterminate and decorative. The three labels remain scope labels, not claims that three backend jobs completed.
- No arrows, particles, sweeping gradients, glow fields, bouncing, layout animation, or additional dependency.
- The neutral loader used when safe matchup identity is unavailable remains neutral and does not invent teams or stages.

The repeating rail exists only while the real cold request is pending. It stops because the loading component unmounts when real data arrives; it does not control request completion.

### 3. Real loading lifecycle and content handoff

Keep `isColdLoad = isLoading && !data` as the sole trigger for the Matchup Briefing.

- Fast response: render canonical content immediately; never wait for a cycle, final stage, ripple, or exit timer.
- Slow response: the indeterminate signal loops calmly until the request resolves.
- On resolution: remove the loader immediately and reveal canonical content with a one-shot 180ms opacity transition.
- If the signal naturally reaches Team Comparison before resolution, it may settle there briefly as part of its loop; no artificial hold will be introduced.
- Existing errors, cached data, quiet background refresh, canonical backend identity, and temporary navigation-only identity remain unchanged.

Because “do not delay real data” takes priority, there will be no JavaScript exit timer. The loader’s removal is immediate; the incoming content provides the visible crossfade. This avoids holding fast responses for a cosmetic fade-out.

### 4. Return to the dated Matchups slate

Preserve all existing `?date=YYYY-MM-DD` return destinations.

- Apply a short one-shot fade to the Matchups content when it is mounted again; never replay the analysis loader.
- For the in-page “Back to games” action, pass the departed game ID as temporary router navigation state and briefly soften that matching card’s border when practical.
- The emphasis is one subtle border fade only—no flash, pulse, scrolling, storage, or change to card dimensions.
- Header/footer Matchups links and native browser Back continue to preserve the date under their current rules; they do not require the optional card emphasis to work.

## Reduced motion and accessibility

- Under `prefers-reduced-motion: reduce`, disable the entrance movement, traveling dots, ripple, rail loop, stage accents, and return emphasis animation.
- Show the card and content immediately.
- Keep a static muted rail and a restrained static active treatment so the loading state remains understandable.
- Preserve the existing polite `role="status"`, `aria-live`, and `aria-busy` behavior.
- Decorative line, dots, rail, and ripple are hidden from assistive technology.

## Files

Expected focused changes:

- `src/components/MatchupAnalyzing.tsx` — handoff and progress-rail presentation.
- `src/pages/Matchup.tsx` — immediate canonical reveal and optional return navigation state.
- `src/pages/Slate.tsx` — short return reveal and optional matching-card border fade.
- `src/index.css` — semantic motion palette and reduced-motion-safe animation classes.
- `tailwind.config.ts` — named keyframes/animation and semantic palette mappings.
- `src/test/game-details-loading.test.tsx` — structure, indeterminate semantics, prohibited-motion, and reduced-motion hooks.
- `src/test/game-details-transition-page.test.tsx` — request-driven replacement, canonical identity, and no artificial delay.
- Relevant Slate/date-navigation tests — dated return and optional departed-card treatment.

No new animation package, route, storage, service, or architecture layer.

## Verification

1. Focused tests for the loader, route lifecycle, Slate return, and selected-date preservation.
2. Full test suite, TypeScript check, and production build.
3. Browser checks at desktop and mobile widths for:
   - light mode: Matchups → slow loader → matchup;
   - dark mode: Matchups → slow loader → matchup;
   - fast response: canonical content appears without waiting;
   - slow response: calm continuous rail with no overflow or layout shift;
   - reduced motion: static, immediate, understandable state;
   - matchup → original dated Matchups slate;
   - neutral loading when trusted temporary matchup identity is unavailable.
4. Confirm no publication or deployment.
