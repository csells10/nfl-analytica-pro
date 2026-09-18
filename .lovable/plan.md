# Pass 4 finishing refinements: contextual Help and Game Details transition

## Confirmed current behavior

- Matchup Lab has six parsed views: `overview`, `constellation`, `lens`, `lenses`, `gaps`, and `momentum`.
- The first valid live-evidence visit and every manual Help request currently use the same four-step Overview guide.
- The shared Help event already targets only `matchup-lab`; the Lab page owns the parsed view, so it can select contextual wording without changing route ownership or adding storage keys.
- Matchups navigates to Game Details with the selected schedule game and `fromDate` in navigation state. A direct `/matchup/:id` visit has no such state.
- Game Details requests only the route game id with query key `['nfl-game', gameId]`. Its authenticated response supplies canonical teams and all analysis.
- The existing cold loader cycles four phrases, enforces a one-second minimum display, and uses skeleton blocks, shimmer, sweeping gradients, and repeated animation. Cached data bypasses it and refreshes quietly.

## 1. Context-aware Matchup Lab Help

Keep `gamelens.guide.matchup-lab.v1` as the only Lab guide key. The automatic first-visit guide remains the existing four-step Overview orientation. Extend the guide controller only enough to distinguish an automatic opening from a manual Help opening. On manual opening, `MatchupLens` chooses steps from its already-parsed current view; no view is written to storage or sent through the Help event.

### Automatic first visit: Overview orientation, unchanged

1. **Where you are** — “The header shows the matchup, the evidence window and as-of date, and the view you are currently reading.”
2. **Start here** — “The Biggest Edge is the clearest separation between these two teams for this window.”
3. **Three ways to go deeper** — “Compare the teams side by side, explore the biggest edge on its own, or browse all six lenses.”
4. **Supporting evidence** — “Each read lists the evidence behind it. Select a signal or metric to open its trace details.”

### Manual Help: exact contextual steps

#### Overview

1. **Matchup context** — “The top of the Lab shows the teams, evidence window, as-of date, and the view you are reading.”
2. **Start with the edge** — “Start Here summarizes the matchup, while Biggest Edge identifies the clearest separation in this evidence window.”
3. **Choose a path** — “Compare the teams on one shared shape, open the biggest edge, or browse all six lenses.”

#### Constellation / Compare the teams

1. **One shared shape** — “Both teams are plotted on the same six-axis profile so you can compare their shapes at a glance.”
2. **Inspect a lens** — “Select a lens score or its axis to open that lens and review the supporting evidence.”
3. **Return to the summary** — “Use Back to Overview to return to Start Here, Biggest Edge, and the three exploration paths.”

#### Focused lens / Biggest Edge or another lens

1. **Read the lens** — “The two lens scores summarize how each team grades for this football question in the current evidence window.”
2. **Check the support** — “Supporting evidence shows the signals and metrics behind the lens read, including readiness notes when evidence is limited.”
3. **Open a trace** — “Select a signal or metric to inspect its trace details, or use the lens controls to continue through the other lenses.”

#### All six lenses / Browse all six lenses

1. **Choose a football question** — “Each tile represents one of the six matchup lenses. Select any tile to open its focused view.”
2. **Check readiness** — “Readiness notes explain when a lens has complete, partial, uneven, or unavailable evidence.”
3. **Go deeper** — “Opening a lens reveals its team scores, supporting evidence, signals, and trace access.”

#### Top profile gaps

1. **Largest differences** — “This view brings the strongest profile differences for the current evidence window into one list.”
2. **Open the related lens** — “Select a gap to open its focused lens and review the supporting evidence, or return to Overview for the matchup summary.”

#### Momentum

1. **Profile movement** — “Momentum shows how the available matchup profile changes across evidence snapshots.”
2. **Keep the current context** — “Use the view as supporting context, then return to Overview for Start Here and the main exploration paths.”

The last two prevent existing parsed views from falling back to unrelated Overview instructions. Collision, Technical Map, Run Visibility, and removed navigation remain absent.

## 2. Game Details loading transition: six directions

### A. Matchup Briefing — recommended

- **What Christian sees:** A compact briefing card with recognized away/home logos and full names, a clear “Away at Home” line, safe date or week context, “Preparing game analysis,” and three static scope labels: Game Profile, Core Areas, Team Comparison.
- **Difference from Lab loader:** The Lab loader is a centered identity lockup; this looks like a concise report cover and previews scope without pretending results exist.
- **Motion:** The complete card fades in once; the completed Game Details page fades in once. Everything inside remains still. Reduced motion removes both animations immediately.
- **Mobile:** Logos and names stay in a compact three-column matchup row; date/week and scope labels wrap below without horizontal scrolling.
- **Advantage:** Clearest bridge into the actual Game Details sections and strongest fit with GameLens’s practical report-like character.
- **Drawback:** Slightly denser than the accepted Lab loader.

### B. Split-Field Introduction

- **What Christian sees:** Away and home identity on opposite sides of a restrained center divider with “at,” followed by “Preparing game analysis.”
- **Difference from Lab loader:** Wider, more matchup-introduction oriented, with a field-side composition rather than a centered report lockup.
- **Motion:** Each team group moves inward a few pixels while fading once; then all content is still. The completed page fades in once. Reduced motion makes every state immediate.
- **Mobile:** The opposing groups remain balanced in a compact three-column row with smaller logos and wrapped full names.
- **Advantage:** Strongest sense of entering a specific game while remaining restrained.
- **Drawback:** More broadcast-flavored and less analytical than the rest of Game Details.

### C. Analysis Dossier

- **What Christian sees:** A compact dossier panel with matchup identity across the top and three plain rows below: Game Profile, Core Areas, Team Comparison. No blocks imply unfinished metrics and no completion marks imply progress.
- **Difference from Lab loader:** Structured like an analysis file rather than an identity-first holding screen.
- **Motion:** The whole dossier fades and rises a few pixels once; the completed page fades in once. Nothing loops. Reduced motion removes movement and fades.
- **Mobile:** The top identity stacks cleanly while the three dossier rows remain full-width and readable.
- **Advantage:** Most explicitly analytical and distinctly GameLens.
- **Drawback:** Can feel heavier than necessary for a fast response and is closest to a formal dashboard panel.

### D. Matchup Index

- **What Christian sees:** A slim vertical index: the matchup identity at the top, then three numbered text entries—01 Game Profile, 02 Core Areas, 03 Team Comparison—with “Preparing game analysis” beside the index rule.
- **Difference from Lab loader:** Uses an editorial index and reading order instead of a centered matchup lockup or briefing card.
- **Motion:** One vertical rule draws downward once while the complete composition fades in; all labels remain still afterward. Completion uses one short fade. Reduced motion shows the finished composition immediately.
- **Mobile:** The index becomes a compact single-column list beneath the team row; numbers stay aligned in a narrow fixed column.
- **Advantage:** Highly scannable, distinctive, and truthful about scope without simulating results.
- **Drawback:** More editorial than familiar, so it may call slightly more attention to the loading state.

### E. Matchup Header Hold

- **What Christian sees:** A near-final Game Details header using temporary recognized team identity, with “Preparing game analysis” where loaded metadata will later settle; the rest of the content area stays intentionally empty.
- **Difference from Lab loader:** Visually reserves the real page’s header position, reducing the perceived transition when canonical content arrives.
- **Motion:** The header fades in once and remains still; the canonical completed page crossfades in place. Reduced motion swaps immediately.
- **Mobile:** It mirrors the existing compact Game Details header, allowing names to wrap and keeping the status area empty until the response arrives.
- **Advantage:** Lowest visual disruption and smallest perceived layout shift.
- **Drawback:** Temporary identity could look more authoritative because it occupies the final header position, requiring especially clear loading semantics.

### F. Scouting Cover

- **What Christian sees:** A full-width, unframed cover with a small “GameLens / Game Details” label, large stacked “Away at Home” names with logos, and a restrained footer line reading “Preparing game analysis.”
- **Difference from Lab loader:** Uses an editorial cover-page hierarchy and asymmetric typography instead of the Lab’s symmetrical centered lockup.
- **Motion:** The entire cover fades in once; a short teal rule expands once beneath the title and then stops. Completion fades once. Reduced motion displays the final static cover immediately.
- **Mobile:** Names stack vertically with “at” between them; logos stay beside each team name and the footer remains below the fold-safe identity block.
- **Advantage:** Strongest visual identity and clearest distinction from the Matchup Lab loader.
- **Drawback:** Most visually prominent option and may feel oversized for a small utility-focused product.

## Final recommendation

Choose **A. Matchup Briefing**. It uses the same calm entrance and truthful temporary identity rules as the accepted Lab reveal, but its static scope labels make Game Details feel like a report being prepared rather than a second copy of the Lab loader. It also maps directly to the existing Game Profile, Core Areas, and Team Comparison content, works in the current `max-w-4xl` page without redesign, and is the safest density for both desktop and mobile.

Approval of this plan selects **A** unless Christian requests B, C, D, E, or F.

## Temporary identity and safety rules

- Use only the existing Matchups navigation-state `game` object for temporary away team, home team, date, and week context.
- Resolve team presentation through the explicit registry-only lookup already introduced for the Lab loader. Both teams must be recognized before showing either team, its logo, or its name.
- Show date or week only when the navigation state actually contains it; do not parse identity or calendar context from the route id and do not invent missing values.
- A direct visit, refresh, stale/malformed navigation state, or unrecognized team produces a neutral “Preparing game analysis…” state with no guessed identity.
- Never feed temporary state into the authenticated request, calculations, content, or canonical header. The backend response replaces it completely.
- Do not render scores, evidence, conclusions, readiness, warnings, or fake analytical placeholders while loading.
- Remove the artificial one-second minimum. Do not delay valid data for animation completion.

## Smallest likely implementation impact

- `src/lib/guides.ts`: expose whether the current opening was automatic or manually requested while preserving the existing event and storage keys.
- `src/pages/MatchupLens.tsx`: keep the automatic Overview steps and select the exact manual guide copy from the parsed view.
- `src/components/MatchupAnalyzing.tsx`: replace the current animated skeleton with the selected static transition and accept optional, validated navigation context.
- `src/pages/Matchup.tsx`: safely read the existing navigation-state game, pass temporary display context only to the loader, remove the forced minimum duration, and apply a one-shot completion fade without changing loaded content.
- Reuse `getKnownTeam`, `teamLogoUrl`, existing semantic tokens, and the accepted one-shot reveal utility where appropriate; add no new architecture layer.
- Update focused guide tests and add focused Game Details loading tests for recognized and neutral entry paths, no premature analysis, canonical replacement, no prohibited motion, reduced motion, cached-data behavior, error behavior, and unchanged request identity/query key/retry behavior.
- Run focused tests, the full suite, typecheck, and production build. Verify desktop and mobile layouts where authentication permits. Do not publish, deploy, or begin Pass 5.
