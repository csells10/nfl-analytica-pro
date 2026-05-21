## v1.7.13 — Matchup Lean user-facing confidence wiring

### Goal
Update the Matchup page so the visible confidence text in the Matchup Lean card prefers the newer backend field `matchup_lean.user_facing_confidence.label`, falling back to legacy `matchup_lean.confidence` only when absent.

### Why
The backend now exposes `user_facing_confidence` as its product-safe confidence mouthpiece. The frontend currently renders `lean.confidence` directly in the legacy fallback path, which can overstate confidence.

### Changes

**`src/lib/nfl-api.ts`** (additive type only)
- Add `user_facing_confidence?: { label?: string | null; summary?: string | null } | null` inside `matchup_lean`.

**`src/pages/Matchup.tsx`** (two targeted edits)
1. In `MatchupReadBlock`, update the legacy-fallback confidence pill:
   - Resolve label as `lean.user_facing_confidence?.label?.trim() || lean.confidence || null`
   - Pass the resolved label into both the pill text and `confidenceTooltip()`
   - Keep the exact same layout, classes, and InfoTip wrapper
2. Keep `classifyConfidence()` and `CONFIDENCE_STYLE` as-is (already a pure string classifier; no active dot UI to wire today).

### What stays unchanged
- New-read path (`profile_strength` / `outcome_confidence` / `matchup_label` chips)
- `classifyConfidence` and `CONFIDENCE_STYLE` definitions (dead code, no layout impact)
- Matchup Lean logic, Model Trust, Team Comparison, Core Area, Game Profile, routing, fetching
- Confidence wording, outcome wording, onboarding/tour
- `claim_language_context`, `ranking_context`, `lens_tags`, team colors, green/red colors

### QA target
`/matchup/20251013_BUF@ATL` — verify that if `user_facing_confidence.label` is present, the legacy confidence pill renders that label; otherwise it falls back to `lean.confidence` exactly as before.

### Summary after build
- files changed
- exact field precedence used
- legacy fallback confirmation
- QA notes for `20251013_BUF@ATL`