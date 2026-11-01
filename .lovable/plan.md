# DraftKings event link: findings and plan

## Product conflict to resolve first
GameLens rules say it is "not a betting product," and the Matchups list is meant to show "no betting data." A sportsbook link goes against both. If you still want it, confirm the exception, and I'll record it so the two rules don't contradict each other. Suggested scope: game details page only, not the Matchups list or Matchup Lab.

## What I found
- **Our data has no DraftKings links or IDs.** The app only uses team abbreviations, ESPN logo IDs, and our own game IDs (for example `20261101_PHI@WSH`). There is no field linking a game to an outside event, and the backend tables listed in our project notes don't include one either.
- **I could not confirm the dates of the four examples.** DraftKings blocked every request with "Access Denied." The links don't include a date, so I can't say which week they belong to. None of the four games is marked as verified.
- **The event numbers can't be worked out from patterns.** 34118130, 34118131, 34118214 and 34118246 don't follow kickoff order or our game IDs. That rules out guessing, as you required.
- **DraftKings has no public API for this.** Its internal endpoints block automated access, and scraping them would be fragile and likely break its terms of use.

## Outside service needed
Getting these links reliably requires a licensed odds-data provider that returns DraftKings event links. For example:
- The Odds API (paid plans; `includeLinks=true` returns bookmaker event links)
- OpticOdds or SportsDataIO (commercial, more expensive)

You would need to choose a provider and add an API key before any building starts. I haven't checked current pricing or whether each provider's links go to the specific game page or only the league page. That needs a trial key.

## Smallest reliable approach (backend work, done outside Lovable)
1. A scheduled backend job fetches upcoming NFL events and their DraftKings links from the provider.
2. It matches each event to a game in `League.schedule` on three things: exact home team, exact away team, and game date in US Eastern time. It translates abbreviations through one shared alias table (for example WSH/WAS, JAC/JAX, LA/LAR) and never by name similarity.
3. It saves the link only if exactly one game matches. Results are recorded as `matched`, `missing` or `ambiguous` (for example a doubleheader or a duplicate listing). Ambiguous results are never saved as links.
4. `GET /game/<id>` adds an optional `external_links.draftkings = { url, verified_at }`. The backend only accepts links that start with `https://sportsbook.draftkings.com/event/`.
5. Links expire: the job refreshes them, and the backend stops returning a link once the game is Final or the provider drops the event.

## Frontend (small, after the backend is ready)
- On game details, show "View on DraftKings ↗" only if the backend provides a link. It opens in a new tab, so GameLens stays open, and it is a plain link with no wager selected.
- If there is no link, or it is ambiguous or expired, nothing is shown. There is no search page fallback and no link is built from our IDs.
- Tests: the link shows when the backend provides one, is hidden otherwise, and uses the exact link and new-tab settings.

## Validating with the four examples
Once the provider is connected, check that the job independently produces these four exact links and the matching games and dates: BAL@BUF 34118214, IND@JAX 34118246, TEN@CIN 34118130, ARI@DAL 34118131. Then check a full week for coverage and for missing or ambiguous results. These four are test cases only and are not stored in the app.

## Decisions needed from you
1. Approve the betting-link exception and where it appears.
2. Choose a provider and whether you'll pay for it.
3. Backend changes happen outside Lovable, so you (or whoever runs the backend) build steps 1–5 first.
