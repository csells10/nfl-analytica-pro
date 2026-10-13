# Matchups initial date selection — proposal

## 1. What the current code does (verified)

- `Slate.tsx` sets `selectedDate` to `new Date()` (today) on mount when there is no `?date=`.
- `useScheduleScan(initialDate)` fires seven parallel `GET /games?date=…` requests (today plus six days), keyed `["nfl-schedule", date]`.
- `useNflSchedule(selectedDate)` asks for today with the same key, so React Query shares it. **There is no duplicate request** and no sequential fallback.
- While the scan runs, the page body shows "Finding upcoming games…", but the date picker button already shows **today**. When the scan finishes, a one-time effect moves the selection to the earliest date with games and rewrites the URL with `replace`.
- **Conclusion:** this is a premature date display. The picker commits to today before the real decision is made, so the user sees two decisions.
- Other current behavior:
  - `?date=` from a link or a return trip is never replaced.
  - Failed dates are ignored and never described as "no games".
  - "No games in the next seven days" appears only when all seven requests succeed.
  - Dates with games are underlined in the calendar.
- Help guide: `MATCHUPS_GUIDE_STEPS` in `Slate.tsx`, run through `useGuide("matchups")`.
  - **Trigger:** it opens automatically on the first Matchups visit in this browser, when the key `gamelens.guide.matchups.v1` is not yet set.
  - The Help button reopens it at any time.
  - Finish, Skip, Close and Escape all mark it as seen.
  - Step 1 currently says: "GameLens opens on the next date with games."

## 2. Recommended approach

Your proposal matches the existing discovery logic, so no new mechanism is needed. Only the display changes:

- While discovery is pending on a fresh visit, the picker shows a neutral "Finding next game date…" label instead of today. The page body keeps the single "Finding upcoming games…" state.
- The resolved date and its games appear together once discovery settles.
- If no date with games is found:
  - When all seven requests succeeded, select today and show the existing "No games found in the next seven days. Choose another date." message.
  - When some requests failed and none had games, select today and show a distinct notice: "Some dates couldn't be checked. Choose a date to try again." Do not claim there are no games.
- If today's own request fails, keep the existing error state for the selected date.

Adjustment to your idea: keep the date picker usable during discovery (see section 3) instead of locking it.

## 3. Window, timezones, explicit dates, manual interaction

- **Window:** seven calendar dates starting with today in the browser's local time (`scanWindow`, unchanged). The backend groups games by `YYYY-MM-DD`.
  - Assumption: the backend dates games on the US schedule date.
  - Limitation: viewers far from US time zones near midnight may see the window start one day off. This is flagged, not changed.
- **Explicit dates:** if `?date=` is present (deep link, return trip, shared link), discovery never changes the selection and the picker shows that date immediately. The calendar highlighting scan still runs.
- **Manual pick while pending:** the user's pick wins right away. It marks automatic selection as done so the scan result can't override it later. Today this is a real race: a pick made during the scan can be replaced. This proposal fixes it.

## 4. Help text

Replace the body of step 1 ("Choose a game date") with:

> "When you open Matchups, we look for the next date with games within seven days, including today, and select it automatically. You can always choose another date using the date picker."

Nothing else changes: same steps, same storage key, same automatic opening, Help reopening and dismissal.

## 5. Implementation and verification

Files: `src/pages/Slate.tsx` only. Tests: `src/test/pass4-guides-schedule.test.tsx`.

- In `Slate.tsx`:
  - Add a pending-label branch to the picker button.
  - Mark automatic selection as done in `handleSelectDate`.
  - Add the partial-failure empty notice.
  - Update the step 1 copy.
- New or updated tests:
  - A fresh visit doesn't show today in the picker while the scan is pending.
  - The resolved date and its games render together.
  - Each date is requested only once (no duplicate fetches).
  - An explicit `?date=` is never replaced.
  - A manual pick during the scan is not overridden.
  - All seven empty shows the clear empty state.
  - Failures with no games show the "couldn't be checked" notice, not "no games".
  - The guide shows the new copy, and its opening and dismissal still work.
- Run the focused tests, full suite, type check and production build. Check desktop and mobile with Playwright using stubbed responses.
- Nothing is published or deployed. No changes to the backend, request layer or query keys.
