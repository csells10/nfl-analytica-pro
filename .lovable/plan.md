# GameLens backend cutover — pre-change inspection report

Analysis only. No files were changed, no backend calls were made, no preview or publish was triggered.

## A. Current API configuration

- Exact production base URL: `https://nfl-games-app-main-362530996210.us-central1.run.app`
- Location: `src/lib/nfl-api.ts`, line 7, exported constant:

```ts
export const API_BASE = "https://nfl-games-app-main-362530996210.us-central1.run.app";
```

- It is **hardcoded in source**. There is no `.env` file in the project, no `import.meta.env` reference anywhere in `src/`, and no `VITE_*` variable used by the app. Confirmed by a repo-wide search for `run.app`, `API_BASE`, `import.meta.env`, and `VITE_`.
- No secrets are involved in this constant. The Firebase web config in `src/lib/firebase.ts` (apiKey redacted here, publishable by design) and the OAuth Web Client ID are the only other embedded identifiers.

## B. All API URL consumers

Only two files, and they share one constant — there is no duplicate definition.

| File | Usage |
|---|---|
| `src/lib/nfl-api.ts` | Defines `API_BASE` (line 7); uses it at line 119 (`/games?date=`) and line 382 (`/game/{id}`) |
| `src/lib/admin-api.ts` | Imports it: `import { ApiError, API_BASE } from "@/lib/nfl-api";` (line 10); uses it at line 226 (`/admin/gamelens/claim-health`) and line 282 (`/me`) |

Confirmed: `admin-api.ts` does **not** define its own URL. Changing line 7 of `nfl-api.ts` redirects every backend call in the app, including `/me`.

No other Cloud Run URLs exist in the frontend source.

## C. Preview/environment capabilities

- This project has **no separate dev/preview/production environment variables**. Vite env files are absent and unused; one source constant serves all environments.
- Lovable's preview URL and the published production site are built from the **same branch source**. Editing `API_BASE` on the working branch changes what the preview serves *and* what the next publish would ship.
- Preview origin for this project: `https://id-preview--a37ecb52-9bbe-4bac-a777-e82669f80951.lovable.app`. Production: `https://nfl-analytica-pro.lovable.app`, `https://gamelens.io`, `https://www.gamelens.io`.
- Key isolation fact: **the already-published production site does not change when the preview changes.** Live `gamelens.io` keeps serving the last published build until someone clicks Publish/Update. So a source edit is safe for production as long as no publish occurs.
- Mechanisms that could give a genuinely isolated candidate frontend:
  1. **Edit on a Lovable branch** (recommended) — a branch gets its own preview URL and cannot reach production without an explicit merge + publish.
  2. **Remix/duplicate project** — strongest isolation, but a new Firebase authorized domain and new CORS entry are still required, and it drifts from main.
  3. **Edit on the main working branch without publishing** — works, but one accidental Publish ships the candidate URL to `gamelens.io`. Higher risk.
- `UNKNOWN`: the exact preview hostname a new branch would receive (Lovable assigns it at branch creation).

## D. Firebase and CORS requirements

- Yes, Firebase Auth is used. Config in `src/lib/firebase.ts`: `authDomain: "auth.gamelens.io"`, `projectId: nfl-stream-406420`, plus `GOOGLE_WEB_CLIENT_ID` for the iOS-Chrome GIS path in `src/lib/gis.ts`. All values are publishable client identifiers; no secret is present in the frontend.
- Auth configuration does **not** differ between preview and production — the same hardcoded Firebase config is used everywhere.
- Before sign-in works on a preview origin you would need:
  - Firebase Console → Authentication → Settings → **Authorized domains**: add the preview host (e.g. `id-preview--<id>.lovable.app` or the branch preview host). This is additive and does not affect `gamelens.io`.
  - Google Cloud Console → Credentials → the Web client → **Authorized JavaScript origins**: add `https://<preview-host>` (required for the GIS path; also good hygiene for popup sign-in). Redirect URIs do not need a new entry because the handler stays on `auth.gamelens.io`.
- CORS: yes. The candidate Cloud Run service must allow the preview origin for `/me`, `/games`, `/game/{id}` — including OPTIONS preflight, since requests carry an `Authorization` header. Without it, calls fail with `Failed to fetch` exactly like the earlier `/me` incident. Adding the preview origin to the candidate service only; production service untouched.

## E. Recommended isolated preview procedure

Smallest reversible sequence (to run only after approval):

1. Create a Lovable **branch** (e.g. `packet4-candidate`) from current main. Nothing on production changes.
2. On that branch, change **one line** — `src/lib/nfl-api.ts` line 7 — to the candidate URL. No other file.
3. Note the branch preview origin Lovable reports.
4. Add that origin to Firebase Authorized Domains and to Google OAuth Authorized JavaScript origins (additive only).
5. Add that origin to the candidate backend's CORS allowlist (candidate service only).
6. Sign in on the preview and exercise only: `/me` (via the access gate), `/games?date=2026-08-06` (Slate date picker), `/game/20260806_CAR@ARI` (matchup route). No POST `/`, no `/test`, no historical final game.
   - Note: React Query persists responses to `localStorage` for 24h. Use a fresh/incognito profile for the preview so cached production responses don't mask candidate behavior, and so preview data doesn't linger.
7. Teardown: delete the branch (or revert the one line). Optionally remove the preview origin from Firebase/Google/CORS.

Rollback is a single-line revert back to `https://nfl-games-app-main-362530996210.us-central1.run.app`.

Risks to keep in view:
- **Publish is the only real danger.** Do not click Publish/Update while the candidate URL is in source.
- Working on main instead of a branch makes that misclick production-affecting — prefer the branch.
- Auth-domain and OAuth-origin edits are shared, project-wide Google settings: they are additive, but they are edits to production Google config, not to the app.
- If the candidate backend lacks `/me`, the app will hang on "Checking access…" (the same failure mode as the earlier dev-over-prod deploy). Verify `/me` exists on the candidate before testing.

## F. Files/settings that would eventually need temporary modification

| Item | Change | Reversible by |
|---|---|---|
| `src/lib/nfl-api.ts` line 7 (`API_BASE`) | Point to candidate URL | One-line revert / delete branch |
| Firebase Console → Authorized domains | Add preview host | Remove entry |
| Google Cloud → OAuth Web client → JS origins | Add `https://<preview-host>` | Remove entry |
| Candidate Cloud Run service CORS allowlist | Add preview origin | Remove entry |

No other frontend file needs to change. `src/lib/admin-api.ts` follows automatically via the shared import.

## G. Confirmation

No files were created, edited, saved, committed, previewed, published, or deployed. No backend request was made. No project setting was changed. This document is the report only.
