# Run Visibility live-request diagnostic (branch-only)

## What the code already proves

The string "Run Visibility could not read evidence right now." exists in exactly one place: `SAFE_MESSAGE.server` in `src/lib/run-visibility-api.ts`. It is rendered by `ErrorPanel` in `src/pages/AdminRunVisibility.tsx` (line 65) via `safeErrorMessage(error)`.

`safeErrorMessage` returns that string only when the thrown value is a `RunVisibilityError` with `kind === "server"`. That kind is produced in `kindForResponse` only after an HTTP response has been received, when either:

- the backend body carries `code`/`error` = `run_visibility_query_failed`, or
- the status is >= 500, or
- the status is a non-ok status that matches none of 400/401/403/404 (fallback branch).

This narrows the failure boundary already:

- It is not a token/pre-request failure — a missing token throws `unauthenticated` ("Your session has expired…").
- It is not a network/CORS failure — that throws `network` ("Could not reach the development Run Visibility service.").
- It is not a JSON-parse failure — that throws `invalid_response`.
- It is not a normalization/render failure — normalization throws plain errors, which render "Something went wrong reading Run Visibility."

So an HTTP response was received and it was non-ok. What is still unknown, and what this pass must capture: the exact status, the backend `code`, and the exact request URL sent.

## Why a code change is needed

Lovable cannot read the user's live production browser request. The current panel discards `error.status` and `error.code` before rendering. The smallest way to obtain the missing facts is to surface them in the panel.

## Change (diagnostic only, no fix)

1. `src/lib/run-visibility-api.ts`
   - Add a `phase` field to `RunVisibilityError`: `"token" | "network" | "response" | "normalization"`, set at each existing throw site. No new behavior, no new requests.
   - Record `requestPath` on the error: path + query string only, from the already-built `URLSearchParams`. No host credentials, no headers, no token.
   - Add `authAttached: boolean` — `true` only as proof that a non-empty bearer token was attached to the request, never proof that the token was valid or accepted. Boolean only; the token is never stored, logged, or rendered.
   - Phase rules: a locally missing/unavailable Firebase token is `phase: token` with `authAttached: false`. An HTTP 401 returned by the backend is `phase: response`, with `authAttached` reflecting whether a Bearer token was included in that request.

   - Add `safeDiagnostic(error): string | null` returning a single line such as: `phase: response · status: 500 · code: run_visibility_query_failed · auth: true · /admin/gamelens/run-visibility?season=2026&…`. Returns `null` for non-`RunVisibilityError` values.
   - Normalization failures get wrapped into a `RunVisibilityError` with `phase: "normalization"` and the offending field name only (e.g. `field: overview.source_health`) — never the response body.

2. `src/pages/AdminRunVisibility.tsx`
   - `ErrorPanel` keeps the friendly message exactly as-is on the first line, and renders the diagnostic line below it in small muted monospace text when `safeDiagnostic` is non-null. Retry button behavior unchanged.

3. `src/lib/run-visibility.test.ts`
   - Focused tests: `safeDiagnostic` includes status/code/phase/auth-boolean and the query string; it never contains the token value, an `Authorization` header, or a stack trace. Phase mapping tests: missing local token → `phase: token`, `auth: false`; backend HTTP 401 → `phase: response` with `auth: true` when a token was attached; fetch rejection → `phase: network`; HTTP 500 → `phase: response`; bad response shape → `phase: normalization`.

4. `src/test/run-visibility-page.test.tsx`
   - One test asserting the panel shows both the friendly message and the diagnostic line.

## Explicitly not changed

Firebase config, CORS, Cloud Run, auth flow, backend, the production `API_BASE`, and the development base URL. No fix attempt, no publish, no merge.

## Deliverable

Run tests and typecheck, then hand back the preview URL. You reload `/admin/run-visibility` as an admin, read the one diagnostic line, and paste it back. That line names the proven failure boundary, and the smallest next action follows from it (backend 500 → server-side query; unexpected non-ok status → route/edge; normalization → one named field).
