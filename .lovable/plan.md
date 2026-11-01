# Matchups Ctrl+click investigation and proposed fix

Read-only findings. Nothing has been changed.

## 1. What controls the clicks (confirmed)

`src/pages/Slate.tsx`, `MatchupCard` (around lines 51–120):

- The game row is a `<button>`. Its `onClick` calls `navigate("/matchup/<id>?date=<d>", { state: { game, fromDate } })`.
- "Open/Review in Matchup Lab" is a separate `<button>`. Its `onClick` calls `navigate(buildMatchupLensHref(id, away, home, dateParam))`.
- The outer `<div>` has no handlers. The two buttons are siblings, not nested. Neither handler has side effects besides navigating.

Why Ctrl+click stays in the same tab: a `<button>` has no URL, so the browser can't open it in a new tab. The handler doesn't check for modifier keys, so Ctrl, Cmd, Shift and middle-click all just run `navigate()`. For the same reason, there's no "Open link in new tab" in the right-click menu, and hovering shows no URL.

## 2. What each page needs, and what happens on a fresh tab or refresh

**Game Details (`/matchup/:id`, `src/pages/Matchup.tsx`)**
- In the URL: the game ID (path) and `?date=`.
- In router state: `game` (teams, date and week for the loading briefing) and `fromDate`.
- Without router state:
  - The data still loads. `useGameDetails(id)` fetches `/game/<encodeURIComponent(id)>` using only the path ID.
  - The loading briefing gets `navigationGame` = undefined. Per earlier work, it falls back to a neutral briefing without teams.
  - The return date reads `search.get("date") ?? state.fromDate`. The URL already includes `?date=`, so it survives.
- Conclusion: the page fully works in a fresh tab. The only thing lost is the team names in the loading briefing.

**Matchup Lab (`/matchup-lens?a&b&view=overview&game&fromDate`, `src/pages/MatchupLens.tsx`)**
- Everything is in the URL: game, team abbreviations (display only), view and fromDate. It uses no router state.
- It works in a fresh tab or after refresh.

**Return to Matchups**
- "Back to games" sends `state: { returningFromGame: id }`, which drives the highlight on the card you just viewed.
- In a new tab, Back still goes to `/?date=<d>` with that state. In the original tab, nothing changes: you never left it.

## 3. Sign-in, protected pages and deep links

Confirmed in code:
- Firebase sign-in is stored in IndexedDB first, then localStorage, then sessionStorage (`src/lib/firebase.ts`). A new tab on the same site should restore the session.
- `ProtectedRoute` shows a blank screen until Firebase reports ready. It never redirects early. If no user is found, it sends you to `/login` and remembers the page you were on. After sign-in, `Login.tsx` returns you there.
- Each tab runs its own access check (`useMe`, `["me"]`) against the backend.

Needs live verification:
- That the hosting serves the app for direct links to `/matchup/...` and `/matchup-lens?...` on gamelens.io. The project has no redirect files. Direct links are expected to work, since refresh deep links have been used throughout earlier passes, but I haven't re-checked.
- That a session restores in a new tab in each browser, especially Safari.

## 4. Behavior that depends on these controls

- **Date selection and seven-day scan:** these run on the Matchups page only. The original tab stays put, so they aren't affected. Each new Game Details or Lab tab skips the scan.
- **Return highlight:** depends on `returningFromGame` from the Back button. It's not affected.
- **Scroll:** Game Details scrolls to the top on mount. That's harmless in new tabs.
- **Data requests:** each tab has its own in-memory React Query client, so each tab makes its own requests: `/me`, `/game/<id>` and, for the Lab, `/lens-context`.
  - Game Details and schedule results are saved to shared localStorage for 24 hours (`src/App.tsx`). A new tab may show cached game data at once, refresh it quietly, and skip the cold-load briefing.
  - Several tabs write to the same saved cache. The last one to write wins. Since the content is the same, that's harmless.
  - Lab evidence opts out of saving (`meta: { persist: false }`), so every Lab tab always fetches live.
- **Guides:** the "seen" flags are stored in localStorage. A guide marked seen in one tab may still auto-open in another tab that was already open. That's minor.

## 5. Smallest safe change (recommended, not implemented)

In `src/pages/Slate.tsx` only, turn both buttons into React Router `<Link>` elements:

- **Game row:** `<Link to={"/matchup/<id>?date=<d>"} state={{ game, fromDate }} className="block w-full text-left">`. Keep the same inner markup and the `ref`. Change the `forwardRef` type to `HTMLAnchorElement`, and check where the ref is used for focus.
- **Lab action:** `<Link to={buildMatchupLensHref(...)}>` with the same classes.

`<Link>` already lets the browser handle Ctrl, Cmd, Shift and middle-click, and handles plain clicks inside the app with the same state. That keeps ordinary clicks identical and adds URL previews and "Open in new tab". Use the URL formats that already exist and encode the game ID in the path. No API, sign-in or data changes.

Checks:
- Update `src/test` tests that look up these as buttons by role (Slate, journey, continuity, date-context and navigation tests). They should look up links and check the exact `href`.
- Add one test showing a modified click doesn't trigger in-app navigation.
- Confirm keyboard focus styles still look the same and nothing shifts visually.
- In a signed-in browser, confirm Ctrl+click opens a new tab with both destinations loading, and plain click still shows the briefing, return date and highlight.
- Run the full test suite, type check and build. No publishing.

Open question: is the game ID safe to put in the path as-is? IDs like `20260921_NYG@LAR` already work in the current navigate call. Encoding the ID with `encodeURIComponent` is optional hardening.
