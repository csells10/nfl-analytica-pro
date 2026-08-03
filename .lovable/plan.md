# Packet4 candidate backend — branch-only API_BASE swap

Branch check (done): the sandbox checkout reports the working branch as an ephemeral platform edit branch (`edit/edt-b12e712b-...`), not `packet4-candidate-preview`. I cannot read or set the Lovable branch name from here — branch/git state is platform-managed. So I cannot self-confirm the precondition you asked for.

Prerequisite (you): confirm in the Lovable branch switcher that the active branch is `packet4-candidate-preview`, then approve this plan. Approving is your confirmation; I will apply the edit to whatever branch Lovable has active.

## The change

One file, one line.

`src/lib/nfl-api.ts` line 7:

```text
- export const API_BASE = "https://nfl-games-app-main-362530996210.us-central1.run.app";
+ export const API_BASE = "https://packet4-candidate---nfl-games-app-main-ids7lwjjta-uc.a.run.app";
```

Nothing else is touched. `src/lib/admin-api.ts` picks this up automatically through its existing `import { ApiError, API_BASE } from "@/lib/nfl-api"` — no edit needed there.

## Explicitly not done

- No merge of the branch
- No Publish / Update — published `gamelens.io` keeps serving the last published build
- No Firebase, Google OAuth, Cloud Run, or CORS changes
- No sign-in, no game open, no interaction with the branch preview
- No other file created, edited, or deleted

## Report I will return afterwards

- Branch name
- Branch preview URL and hostname (from project URLs; if Lovable has not yet assigned a branch-specific preview host, I will report it as UNKNOWN rather than guess)
- File changed and the exact one-line diff
- Confirmation: no other files changed, branch not merged, no Publish/Update action, production `gamelens.io` unchanged

Then I stop.

## Rollback

Single-line revert to `https://nfl-games-app-main-362530996210.us-central1.run.app`, or delete the branch.
