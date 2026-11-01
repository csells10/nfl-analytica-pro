# DraftKings game-page link: feasibility check first

## Proposed product-rule exception (wording)
> GameLens may show one optional link to an outside sportsbook's page for a specific game, labeled "View on DraftKings ↗". The link opens in a new tab. It is not tied to any wager or betslip and does not pass any analysis. GameLens itself never shows odds, lines, or prices. It does not recommend wagers and never preselects a bet. The link appears only when the backend supplies a verified game match. If there is no match, GameLens shows nothing.

When this is approved, I'll update the project rules and the "no betting data" note for the Matchups list so they agree. The link would appear on game details only.

## Correction
You're right: The Odds API's free Starter plan (500 credits a month) includes DraftKings, so no paid plan is needed to test it. According to its documentation:
- `GET /v4/sports/americanfootball_nfl/events` lists games with teams and kickoff times and uses **no credits**. It doesn't include bookmaker links, though.
- `GET /v4/sports/americanfootball_nfl/odds?bookmakers=draftkings&markets=h2h&includeLinks=true&includeSids=true` costs **1 credit per call** (1 market × 1 bookmaker group). `includeLinks` adds "bookmaker links to events, markets, and betslips if available." `includeSids` adds DraftKings' own event IDs.
- We would keep only the event-level link and the DraftKings event ID. Betslip and market links, and all prices, would be thrown away and never stored or shown.

The documentation says links are included only "if available." Coverage on the free plan is therefore not confirmed until we test it.

## Step 1: Secure setup (you do this; no key in chat)
1. Sign up for the free Starter plan at the-odds-api.com. The key arrives by email.
2. I'll open a secure form to save the key as a protected project secret named `ODDS_API_KEY`. Please don't paste it into chat. The key is used only for this test and is never added to the app or shown in the browser.
3. Keep it on the free plan. Don't add a card or upgrade.

## Step 2: One-time test (read-only, about 2–4 credits)
- 1 call to `/events` (free) gets the NFL game list.
- 1 call to `/odds` with DraftKings, `h2h`, `includeLinks=true` and `includeSids=true` (1 credit) gets the links and IDs. One retry is allowed if needed.
- From each response I record only: event ID, teams, kickoff time, DraftKings event link and DraftKings event ID. Prices are removed before anything is saved. The key never appears in logs or reports.
- I'll read the remaining-credit counts the API sends back (`x-requests-used` and `x-requests-remaining`) to check the actual cost.

## Step 3: Check against your four examples
For BAL@BUF (34118214), IND@JAX (34118246), TEN@CIN (34118130) and ARI@DAL (34118131), I'll compare:
- both teams, after translating abbreviations through one alias table (for example WSH/WAS and JAC/JAX)
- the game date in US Eastern time from the kickoff time. This also settles the dates I couldn't confirm earlier, because DraftKings blocked those lookups.
- the DraftKings event ID against the number in your link. Links that point to the same page count as a match even if the wording in the address differs.

Games that have already been played may not be listed anymore. Those are marked "no longer available" and are not counted as failures.

## Step 4: Report
- How many upcoming NFL games include a DraftKings event link, how many include an ID only, and how many have neither.
- Which games are missing or ambiguous (for example duplicate listings or two games on the same date).
- Whether links go to the specific game or to a general page.
- Estimated monthly use if we refresh once a day plus an extra refresh on game days: about 30–45 credits a month on the free events list plus 1-credit link calls. That fits comfortably within 500. I'll confirm this against the counts from Step 2.

## Decision point
If coverage and accuracy hold up, I'll write a separate plan for the scheduled backend job and the small game-details link. That plan will include rules for missing, ambiguous and expired links: in each case nothing is shown. If they don't hold up, we stop, and nothing in the app has changed.

## Out of scope for this step
No purchases. No changes to the app or the backend, no scheduled job, and no publishing. The four example links are used only as test cases and never stored in the app.
