# Wire up `lens_tags` as internal metadata (no visible UI change)

Goal: make the backend's `ranking_context.featured_metrics[].lens_tags` available to the frontend in a typed, joinable way — without changing anything the user sees. This sets up later work (emphasis, icon selection, explanatory copy) on a safe foundation.

## Scope

In scope:
- Type the `ranking_context` branch of the `GET /game/:id` payload.
- Join tags to Team Comparison rows using the existing stable `team_comparison[].metric` field.
- Provide a small internal helper that other components can consume later.

Out of scope (explicitly not doing now):
- Any rendered change to Team Comparison, Core Area Advantage, or Game Profile.
- Core-area tag integration — core areas are aggregated, not one-to-one with metrics, so this needs separate backend work first.
- Any display-string / label matching. Joins happen only on `metric`.

## Current state

- `lens_tags` is read nowhere in `src/`. The only occurrence is the string `"lens_tag"` inside `JARGON_TOKENS` in `src/components/CoreAreaAdvantage.tsx` (line 38), which suppresses backend summary text containing it. That suppression stays as-is.
- `ranking_context` and `featured_metrics` are absent from the `GameDetails` interface in `src/lib/nfl-api.ts`, so the branch is currently parsed and discarded.
- `team_comparison[]` is typed at `src/lib/nfl-api.ts` lines 240–264 and does not yet include the `metric` field the backend sends.

## Changes

### 1. `src/lib/nfl-api.ts` — typing only

- Add `metric?: string | null` to the `team_comparison[]` element type. All other fields unchanged.
- Add an optional, additive `ranking_context` block to `GameDetails`:

```ts
ranking_context?: {
  featured_metrics?: Array<{
    metric?: string | null;
    lens_tags?: string[] | null;
  }> | null;
} | null;
```

Typed as optional throughout, matching the existing additive-field convention in this file. Any other fields the backend sends under `featured_metrics` are left untyped and untouched.

### 2. New `src/lib/lens-tags.ts` — internal join helper

A small pure module, no React, no rendering:

- `buildLensTagIndex(details)` — returns a `Map<string, string[]>` keyed by a normalized `metric` value (trimmed, lowercased), built from `ranking_context.featured_metrics`. Entries missing a `metric` or with an empty/non-array `lens_tags` are skipped.
- `getLensTags(index, metric)` — returns `string[]` (empty array when absent). Never throws, never falls back to display-label matching.
- `hasLensTag(index, metric, tag)` — convenience boolean.

Tag values are treated as an open, unversioned vocabulary: unknown tags are carried through as-is and simply match nothing downstream.

### 3. No component changes

`src/pages/Matchup.tsx`, `src/components/CoreAreaAdvantage.tsx`, and `src/components/TeamComparisonEmptyState.tsx` are not modified. The helper is unused by the UI in this step — that is intentional and is what makes the change zero-risk.

## Verification

- Typecheck (`tsgo --noEmit`) and build pass.
- Manual check that a matchup page renders identically to today (nothing consumes the new module).

## Follow-up (not part of this plan)

Once this lands, a later step can use `hasLensTag(..., "strong-signal")` to gate visual emphasis on Team Comparison rows. Core-area tag integration remains blocked on backend work to expose tags at the aggregated core-area level.
