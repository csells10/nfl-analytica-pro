# 🧠 GameLens — Matchup API Product Roadmap & Architecture

This document defines the current state, completed work, product direction, and future roadmap for the GameLens Matchup Page API and UI.

GameLens has evolved from a basic matchup display into a structured, backend-driven **NFL matchup explanation and evaluation system**.

The core principle is:

**Backend defines truth.**  
**Frontend displays it clearly.**

---

# Table of Contents

- [🧠 GameLens — Matchup API Product Roadmap & Architecture](#-gamelens--matchup-api-product-roadmap--architecture)
- [🧭 System Overview](#-system-overview)
  - [Current Purpose](#current-purpose)
  - [Current Product Boundary](#current-product-boundary)
  - [V1 Status](#v1-status)
- [⚖️ Key Distinction](#️-key-distinction)
- [🧠 Architecture Principle](#-architecture-principle)
  - [BigQuery Views](#bigquery-views)
  - [Python Services](#python-services)
  - [Frontend Responsibilities](#frontend-responsibilities)
- [🚫 Guiding Rules](#-guiding-rules)
- [✅ Completed — Core System](#-completed--core-system)
  - [1. Model Trust System ✅ Complete](#1-model-trust-system--complete)
  - [2. Reasoning Summary ✅ Complete](#2-reasoning-summary--complete)
  - [3. Signal Alignment System ✅ Complete](#3-signal-alignment-system--complete)
  - [4. Game Profile — Backend Signal Ownership ✅ Complete](#4-game-profile--backend-signal-ownership--complete)
  - [5. Frontend Alignment ✅ Complete](#5-frontend-alignment--complete)
- [✅ Completed — Core Area + Matchup Lean Alignment](#-completed--core-area--matchup-lean-alignment)
  - [Core Area Advantage ✅ Complete](#core-area-advantage--complete)
  - [Matchup Lean Refinement ✅ Complete](#matchup-lean-refinement--complete)
  - [Model Trust Language Alignment ✅ Complete](#model-trust-language-alignment--complete)
  - [Tooltip Polish ✅ Complete](#tooltip-polish--complete)
  - [Golden Test Case](#golden-test-case)
- [✅ Completed — Private V1 Authentication](#-completed--private-v1-authentication)
  - [Objective](#objective)
  - [Current Auth Flow](#current-auth-flow)
  - [Firestore Allowed Users](#firestore-allowed-users)
  - [Backend API Protection](#backend-api-protection)
  - [Frontend Auth Behavior](#frontend-auth-behavior)
  - [Security Validation](#security-validation)
  - [Known Security Scan Note](#known-security-scan-note)
  - [Status](#status)
- [✅ Completed — Publishing + Branding V1](#-completed--publishing--branding-v1)
  - [Website Metadata](#website-metadata)
  - [Icon and Social Preview](#icon-and-social-preview)
  - [Lovable Badge](#lovable-badge)
  - [V1 Tag](#v1-tag)
- [✅ Completed — User Guidance](#-completed--user-guidance)
  - [Help Icon Behavior](#help-icon-behavior)
  - [How to Read This Matchup Guide](#how-to-read-this-matchup-guide)
- [🧪 V1 QA Findings — Game Review Learnings](#-v1-qa-findings--game-review-learnings)
  - [QA Workflow](#qa-workflow)
  - [Key Product Finding](#key-product-finding)
  - [Major Findings From QA](#major-findings-from-qa)
  - [Month-by-Month Drift](#month-by-month-drift)
  - [Super Bowl QA Learning](#super-bowl-qa-learning)
  - [Data Boundary](#data-boundary)
  - [Updated Product Direction After QA](#updated-product-direction-after-qa)
- [🔜 Proposed — Next Phases](#-proposed--next-phases)
- [🧭 Phase 8 — Auth Polish + Session UX](#-phase-8--auth-polish--session-ux)
- [🧭 Phase 9 — Team Comparison Formatting](#-phase-9--team-comparison-formatting)
- [🧭 Phase 10 — Outcome Quality Labels](#-phase-10--outcome-quality-labels)
- [🧭 Phase 11 — Postgame Swing Factors](#-phase-11--postgame-swing-factors)
- [🧭 Phase 12 — Pregame Profile Weights](#-phase-12--pregame-profile-weights)
- [🧭 Phase 13 — Recent Form / Rolling Window Sanity Check](#-phase-13--recent-form--rolling-window-sanity-check)
- [🧭 Phase 14 — Game Context Flags](#-phase-14--game-context-flags)
- [🔮 Future Enhancements](#-future-enhancements)
- [🧊 Back Burner Ideas](#-back-burner-ideas)
- [⚠️ Known Watchouts](#️-known-watchouts)
- [🎯 Updated PM Recommended Order](#-updated-pm-recommended-order)
- [🧭 Final Objective](#-final-objective)

---

# 🧭 System Overview

## Current Purpose

The `/game/<game_id>` endpoint powers the GameLens matchup detail page.

It is responsible for:

- Explaining matchup dynamics between two NFL teams
- Identifying directional matchup signals
- Comparing broader team-strength categories
- Producing a calibrated Matchup Lean
- Showing model confidence context
- Evaluating whether the model prediction was correct after final games
- Explaining model misses as calibration issues when appropriate
- Supporting future feedback and model improvement

The `/games?date=YYYY-MM-DD` endpoint powers the matchup list page.

It is responsible for:

- Returning games for a selected date
- Supporting navigation into individual matchup detail pages

---

## Current Product Boundary

GameLens V1 is an **Explanation Layer**.

It helps users understand:

- what the model sees
- which team has signal support
- whether Core Areas confirm or soften the lean
- how confident the system should be
- why the model was correct or incorrect

It is **not yet** a betting recommendation engine.

---

## V1 Status

GameLens V1 is now published as a private-access product.

Current V1 includes:

- Published GameLens site
- Custom icon and website metadata
- Google Sign-In
- Firestore-managed allowed users
- Protected Cloud Run backend APIs
- Core Area Advantage
- Matchup Lean alignment
- Model Trust explanation
- Safe frontend error handling
- User guidance modal
- Private access validated with multiple allowed users

Stable milestone tag:

`v1-private-auth`

---

# ⚖️ Key Distinction

Matchup API = Explanation Layer  
Rubric / Betting System = Future Decision Layer

These should **not** be merged prematurely.

The Matchup API should first become trustworthy, consistent, and easy to understand.

Only after that should it become an input into a future betting or decision-support layer.

---

# 🧠 Architecture Principle

Views feed the model.  
Python is the model.  
Frontend renders the model.

---

## BigQuery Views

BigQuery is used for:

- Table joins
- Latest metrics selection
- Normalized inputs
- Aggregate season metrics
- Reusable datasets
- Clean model inputs
- Rolling-window inputs
- Postgame box score ingredients

BigQuery should support the model, not become the full product reasoning layer.

---

## Python Services

Python services are responsible for:

- Matchup logic
- Signal scoring
- Core Area interpretation
- Confidence rules
- Matchup Lean language
- Game Profile signal weighting
- Model Trust reasoning
- Outcome evaluation
- Postgame swing factor interpretation
- Feedback loop inserts
- Firebase token validation
- Firestore allowed-user checks

---

## Frontend Responsibilities

The frontend is responsible for:

- Rendering structured API fields
- Displaying cards, labels, colors, icons, bars, and sections
- Managing Google Sign-In state
- Sending Firebase ID tokens to the backend
- Displaying safe user-facing error messages
- Providing lightweight guidance for users

The frontend should **not**:

- Recreate backend model logic
- Parse strings to infer meaning
- Generate explanation text
- Maintain a separate access allowlist
- Render raw backend error bodies
- Render raw structured objects directly into the UI

---

# 🚫 Guiding Rules

- All matchup logic lives in the backend
- Frontend renders structured fields
- No fragile string matching
- No inferred frontend logic
- No duplicated calculations
- No hardcoded “overall matchup edge” wording
- No raw metric dump in the main UI
- Do not overstate an edge when Core Areas are split or nearly even
- Confidence language must match the actual matchup profile
- Backend auth is the real source of access control
- Firestore `allowed_users` is the source of truth for user access
- Pregame logic must not use postgame data
- Postgame review may use final box score data
- Correct / Incorrect is not enough for model learning
- No Pick is a feature, not a failure

---

# ✅ Completed — Core System

## 1. Model Trust System ✅ Complete

Model Trust is fully implemented across backend, API, UI, and feedback structure.

Current product behavior:

- Shows whether the model was correct, incorrect, or made no pick
- Explains why the model leaned the way it did
- Shows signal alignment
- Shows edge strength
- Frames reasonable misses as calibration opportunities
- Avoids overstating low-confidence reads

Current conceptual shape:

```yaml
model_trust:
  reasoning:
    headline: "NO had a slight signal lean in a balanced matchup"
    summary: "The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss."
    has_content: true
    drivers: []

  matchup_advantage:
    visible: true
    away: 2
    home: 3
    leader: "home"
    tooltip: "Counts how many visible Team Comparison metrics favored each team. This is a directional count, not the full model score."

  edge:
    strength: "low"
    score: 0.2
    tooltip: "The visible Team Comparison metrics show only a small edge. Use this as supporting context, not a standalone conclusion."
    has_content: true

  signal_alignment:
    summary_code: "mixed"
    summary_label: "Mixed signals — not all signals agreed"
    aligned_count: 2
    total_count: 3
    tooltip: "Shows whether each Game Profile signal agreed with the model's predicted or leaned team."
    signals: []

  learning_label: "Model miss — learning opportunity logged"
```

### Key Outcomes

- Backend owns all reasoning and interpretation
- Frontend no longer derives model logic
- Model Trust UI appears for final games
- No-pick scenarios are handled cleanly
- Incorrect outcomes can be explained without sounding broken
- Misses can become learning opportunities

---

## 2. Reasoning Summary ✅ Complete

The backend now provides reasoning headline and summary.

Conceptual shape:

```yaml
reasoning:
  headline: "NO had a slight signal lean in a balanced matchup"
  summary: "The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss."
```

### Key Outcomes

- Removed frontend-generated explanation text
- Reduced contradictions
- Added outcome-aware language
- Added profile-aware reasoning
- Improved storytelling across correct, incorrect, and no-pick outcomes

### Result

The system can explain:

- What the model saw
- Why it leaned that way
- Whether the outcome validated or challenged that read

---

## 3. Signal Alignment System ✅ Complete

Signal Alignment explains whether the visible Game Profile signals agreed with the model’s predicted or leaned team.

Conceptual shape:

```yaml
signal_alignment:
  summary_code: "mixed"
  summary_label: "Mixed signals — not all signals agreed"
  aligned_count: 2
  total_count: 3
  signals:
    - category: "Pressure"
      favored_side: "home"
      aligns: "yes"
      sentence: "Pressure favored NO"

    - category: "Turnover Risk"
      favored_side: "home"
      aligns: "yes"
      sentence: "Turnover Risk favored NO"

    - category: "Scoring Efficiency"
      favored_side: "away"
      aligns: "no"
      sentence: "Scoring Efficiency favored SF"
```

### Key Outcomes

- Correct outcomes handled cleanly
- Incorrect outcomes handled cleanly
- No-pick outcomes avoid fake alignment
- Mixed-signal games are not presented as clean edges
- Uses backend-owned structured signal fields

---

## 4. Game Profile — Backend Signal Ownership ✅ Complete

Game Profile signals are now backend-owned.

Conceptual shape:

```yaml
game_profile:
  - category: "Pressure"
    level: "Moderate"
    level_index: 1
    icon: "alert-triangle"
    tilt_team: "home"
    tilt_text: "NO generating more pressure"

  - category: "Turnover Risk"
    level: "Elevated"
    level_index: 2
    icon: "target"
    tilt_team: "home"
    tilt_text: "NO better turnover profile"

  - category: "Scoring Efficiency"
    level: "Moderate"
    level_index: 1
    icon: "trending-up"
    tilt_team: "away"
    tilt_text: "SF more efficient scoring"
```

### Key Outcomes

- Backend defines icon
- Backend defines level index
- Backend defines tilt team
- Backend defines tilt text
- Frontend renders structured signals only
- No frontend parsing or inference

---

## 5. Frontend Alignment ✅ Complete

### Changes

- Removed frontend explanation generation
- Rendered backend reasoning summary directly
- Rendered Matchup Lean fields directly
- Rendered Model Trust fields directly
- Rendered tooltips directly from API
- Added Core Area Advantage UI
- Added safe Core Area Context supporting text
- Replaced raw error rendering with safe mapped messages

### Result

The page now tells one consistent story.

No contradictions.  
No duplicate logic.  
No frontend guessing.

---

# ✅ Completed — Core Area + Matchup Lean Alignment

This phase corrected one of the most important product issues:

A game can have a directional signal lean while the broader Core Area profile is split or nearly even.

The system now handles that correctly.

---

## Core Area Advantage ✅ Complete

Core Area Advantage is now implemented in the backend, API, and frontend.

It appears below Game Profile and above Matchup Lean.

Current Core Areas:

- Defensive Control
- Disruption and Turnovers
- Offensive Output
- Scoring Efficiency
- Field Control / Special Teams when usable data exists

Conceptual shape:

```yaml
core_area_comparison:
  - core_area: "Defensive Control"
    away_score: 0.333
    home_score: 0.667
    leader: "home"
    metric_count: 6

  - core_area: "Disruption and Turnovers"
    away_score: 0.318
    home_score: 0.682
    leader: "home"
    metric_count: 11

  - core_area: "Offensive Output"
    away_score: 0.591
    home_score: 0.409
    leader: "away"
    metric_count: 22

  - core_area: "Scoring Efficiency"
    away_score: 0.750
    home_score: 0.250
    leader: "away"
    metric_count: 12
```

### User-Facing Value

Core Area Advantage helps users answer:

- Is one team stronger across the board?
- Are the teams split by category?
- Does the broader team profile confirm the lean?
- Is this actually closer to a coin flip?
- Why is confidence low?

---

## Matchup Lean Refinement ✅ Complete

Matchup Lean now uses Core Area context as a sanity check.

It distinguishes between:

- true broader matchup edge
- slight signal lean
- split profile
- coin-flip profile
- conflicting profile
- no clear edge

Conceptual shape:

```yaml
matchup_lean:
  target_team: "NO edge"
  target_side: "home"
  lean_summary: "This matchup is close overall, with a slight lean toward NO"
  focus_summary: "NO has the stronger signal score, but Core Areas are nearly even overall"
  confidence: "Low"
  confidence_context: "Core Areas are nearly even, limiting confidence"
  profile_type: "coin_flip_profile"

  signal_score:
    away: 3
    home: 6
    gap: 3

  core_area_context:
    available: true
    away_core_wins: 2
    home_core_wins: 2
    neutral_core_areas: 0
    total_core_areas: 4
    away_core_avg: 0.498
    home_core_avg: 0.502
    core_gap: 0.004
    core_area_leader: "neutral"
    core_area_split: "2-2"
    profile_type: "coin_flip_profile"
```

### Profile Types

#### coin_flip_profile

Used when Core Area averages are nearly even.

User-facing meaning:

The matchup is close overall, even if one team has a slight signal lean.

#### split_profile

Used when both teams lead meaningful Core Areas.

User-facing meaning:

The matchup is mixed. The model may lean one way, but the broader profile is not clean.

#### confirmed_edge

Used when signal lean and Core Area context support the same side.

User-facing meaning:

The model has a stronger overall case.

#### conflicting_profile

Used when signal lean points one way but Core Areas do not fully confirm it.

User-facing meaning:

The model sees something, but broader context says to be cautious.

#### no_clear_edge

Used when the signal gap is too small.

User-facing meaning:

The model should avoid forcing a lean.

---

## Model Trust Language Alignment ✅ Complete

Model Trust now aligns with Matchup Lean language.

Before:

```markdown
NO holds the cleaner matchup profile
```

Now:

```markdown
NO had a slight signal lean in a balanced matchup
```

This avoids overstating a matchup when Core Areas are split or nearly even.

---

## Tooltip Polish ✅ Complete

Tooltip wording now reflects what each score actually measures.

### Matchup Advantage

Counts how many visible Team Comparison metrics favored each team. This is a directional count, not the full model score.

### Edge Strength

The visible Team Comparison metrics show only a small edge. Use this as supporting context, not a standalone conclusion.

### Signal Alignment

Shows whether each Game Profile signal agreed with the model's predicted or leaned team.

---

## Golden Test Case

Regression test:

```markdown
/game/20250914_SF@NO
```

Expected Core Area Advantage:

```markdown
Defensive Control: NO edge
Disruption and Turnovers: NO edge
Offensive Output: SF edge
Scoring Efficiency: SF edge
```

Expected Core Area read:

```markdown
Split 2–2
Nearly even overall
```

Expected Matchup Lean:

```markdown
This matchup is close overall, with a slight lean toward NO.
```

Expected supporting line:

```markdown
Core Areas were split 2–2 and nearly even overall.
```

Expected confidence:

```markdown
Low
```

Expected Model Outcome:

```markdown
Predicted: NO
Actual: SF
Result: Incorrect
```

Expected Model Trust headline:

```markdown
NO had a slight signal lean in a balanced matchup.
```

Expected Model Trust summary:

```markdown
The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss.
```

Status:

Validated locally and from deployed Cloud Run / frontend.

---

# ✅ Completed — Private V1 Authentication

## Objective

Add a secure private access layer to GameLens.

Primary goals:

- Prevent unrestricted public app access
- Protect Cloud Run API endpoints
- Avoid unnecessary GCP usage exposure
- Support private QA / family / admin access
- Prepare for future user-specific features

---

## Current Auth Flow

Current V1 auth flow:

1. User visits GameLens
2. User signs in with Google
3. Firebase Auth creates a user session
4. Frontend gets Firebase ID token
5. Frontend sends Authorization: Bearer `<idToken>` to backend API calls
6. Backend verifies Firebase ID token
7. Backend checks Firestore `allowed_users` collection
8. If `active=true`, API response is returned
9. If missing/invalid/not allowed, request is rejected

---

## Firestore Allowed Users

Firestore collection:

```markdown
allowed_users
```

Document ID:

```markdown
lowercase user email
```

Example:

```markdown
allowed_users / csells10@gmail.com
```

Minimum required field:

```yaml
active: true
```

Recommended fields:

```yaml
email: "csells10@gmail.com"
active: true
role: "admin"
display_name: "Christian Sells"
notes: "Owner"
environment: "production"
uid: "pending"
created_by: "manual_firebase_console"
```

Required rule:

```markdown
Document ID must match the signed-in email.
active must be boolean true.
```

To add a new allowed user:

1. Open Firebase Console
2. Go to Firestore Database
3. Open `allowed_users`
4. Add document
5. Use lowercase email as Document ID
6. Add `active=true`
7. Add role and notes if desired

To revoke access:

```yaml
active: false
```

No redeploy required.

---

## Backend API Protection

Protected routes:

```markdown
/games
/game/<game_id>
```

Expected behavior:

```markdown
No token: 401 Unauthorized
Invalid token: 401 Unauthorized
Valid token but missing Firestore access: 403 Forbidden
Valid token and active allowed user: 200 OK
```

Public routes that remain open:

```markdown
/health
/
/test
```

Note:

`/` and `/test` support ingestion / scheduled workflows and should be treated carefully.

---

## Frontend Auth Behavior

Frontend now handles:

- Google Sign-In
- Google Sign-Out
- Firebase session state
- Auth token attachment
- Redirect to login when signed out
- Safe user-facing error messages

Removed:

- Mock email/password login
- Frontend email allowlist enforcement
- Raw backend error rendering

Firestore is now the sole source of truth for access.

---

## Security Validation

Validated production behavior:

```markdown
Direct unauthenticated Cloud Run request:
/game/20250914_SF@NO

Result:
401 Unauthorized
Missing Authorization Bearer token
```

Validated frontend behavior:

```markdown
Allowed signed-in user can load /games
Allowed signed-in user can load /game/20250914_SF@NO
Firestore-added allowed user can log in successfully
```

Confirmed allowed user test:

```markdown
Wife added to allowed_users
Wife successfully logged in
```

---

## Known Security Scan Note

Security scanner may still report:

```markdown
Cloud Run Backend Auth Enforcement Cannot Be Verified Client-Side
Authorization Enforced Only by Unverified Backend Claim
```

Interpretation:

The scanner cannot verify backend route enforcement from frontend code alone.

Actual deployed backend behavior has been manually validated:

```markdown
Unauthenticated direct API call returns 401.
Signed-in frontend with Firebase token succeeds.
```

This is a scanner verification limitation, not an active frontend security issue.

Future hardening options:

- API Gateway
- Identity-Aware Proxy
- Cloud Armor
- Restricted CORS origins
- Custom gateway layer

Not required for V1.

---

## Status

```markdown
Frontend Google Sign-In: Complete
Firestore allowed_users: Complete
Backend Firebase token validation: Complete
Cloud Run protected routes: Complete
Safe frontend error handling: Complete
Private V1 access: Complete
```

---

# ✅ Completed — Publishing + Branding V1

## Website Metadata

Recommended site title:

```markdown
GameLens — NFL Matchup Intelligence
```

Recommended site description:

```markdown
A smarter way to understand NFL matchups through team strengths, signal alignment, confidence context, and model trust.
```

---

## Icon and Social Preview

Custom GameLens icon created and used to replace the default Lovable icon.

Brand concept:

```markdown
A dark navy sports analytics icon combining a lens, football cue, and rising data bars.
```

Social image concept:

```markdown
Dark navy background, GameLens icon, title text “GameLens”, subtitle “NFL Matchup Intelligence”, subtle analytics/grid accents.
```

Purpose:

- Browser favicon
- Search preview
- Link preview
- Social sharing preview
- Product polish

---

## Lovable Badge

Lovable badge / “edited with Lovable” tag removed.

No republish was required after removal.

---

## V1 Tag

Stable V1 milestone tag created:

```markdown
v1-private-auth
```

Purpose:

- Marks first private working V1
- Serves as rollback reference
- Captures stable auth + protected API milestone
- Useful for future handoff and debugging

---

# ✅ Completed — User Guidance

## Help Icon Behavior

The `?` icon is now page-aware.

On Matchups list page:

```markdown
Re-trigger onboarding overlays
```

On Matchup Detail page:

```markdown
Open “How to read this matchup” modal
```

---

## How to Read This Matchup Guide

Purpose:

Teach the intended reading order of the page.

Reading order:

1. Start with Game Profile
2. Check Core Area Advantage
3. Read Matchup Lean
4. Use Confidence as a guardrail
5. After the game, review Model Trust

Product goal:

Guide users through the matchup story without turning the UI into documentation.

Status:

Implemented and published as part of V1.

---

# 🧪 V1 QA Findings — Game Review Learnings

After V1 launch, GameLens was tested across completed 2025 and 2026 games.

The review included:

- September 2025
- October 2025
- November 2025
- December 2025
- January 2026
- Super Bowl LX

The goal was not only to check whether the model picked the correct team.

The deeper goal was to determine whether GameLens told an honest, useful matchup story.

---

## QA Workflow

For each reviewed game, the evaluation used:

- GameLens matchup page output
- Final score
- ESPN box score
- Game Profile Signals
- Core Area Advantage
- Matchup Lean
- Model Trust / Model Outcome
- Team Comparison
- Final game flow and box score evidence

The workflow was intentionally grouped into 5-game batches.

Pattern:

```markdown
1. Record each game
2. Avoid full analysis after each individual game
3. After 5 games, review the batch together
4. Look for product/model patterns
5. Identify recurring fixes
```

This process helped prevent overreacting to one weird game.

---

## Key Product Finding

GameLens is directionally working as an explanation layer.

The strongest product behavior so far is:

- Avoiding forced picks in mixed profiles
- Lowering confidence when Core Areas are split
- Explaining misses as calibration opportunities
- Showing when signal support and Core Area support disagree
- Protecting No Pick scenarios
- Giving useful low-confidence leans when the profile is mixed

The next product leap is:

```markdown
From:
What did the model pick?

To:
What mattered most, how much should it matter, and did the final game validate that weight?
```

---

## Major Findings From QA

### 1. No Pick Is A Feature, Not A Failure

Multiple games showed that `No Pick / Low Confidence` is one of the healthiest behaviors in the product.

When the matchup profile was split or nearly even, GameLens correctly avoided forcing a directional edge.

Observed examples:

- Mixed Core Area profiles
- Small signal gaps
- Playoff/high-leverage games
- Games decided by late execution or turnovers
- Games where one team had an explosive quarter or situational swing

Product rule:

```markdown
No Pick should be protected.

Do not force a lean when signal scoring and Core Area context do not create enough separation.
```

Future outcome label:

```markdown
no_pick_validated
```

Example postgame language:

```markdown
The model avoided a strong call because the matchup profile was mixed. The final result validated that restraint.
```

---

### 2. Low-Confidence Edges Should Say “Leaned,” Not “Predicted”

Low-confidence directional calls are useful, but the language should stay humble.

Current postgame wording can feel too strong:

```markdown
Predicted: PHI
Actual: NYG
```

Preferred wording for Low Confidence:

```markdown
Leaned: PHI
Actual: NYG
```

or:

```markdown
Model Lean: PHI
Actual: NYG
```

Product rule:

```markdown
Use “Predicted” for Medium / High Confidence.
Use “Leaned” for Low Confidence.
Use “No Pick” when target_team is null.
```

This better matches the actual model posture.

---

### 3. Correct / Incorrect Is Not Enough

QA showed that binary model outcome is too shallow.

A correct high-confidence result may still be:

- dominant
- narrow
- low-scoring
- ugly
- heavily dependent on turnovers
- heavily dependent on kicking
- correct but not as strong as the confidence suggested

An incorrect result may be:

- close-game swing
- balanced-profile miss
- high-confidence blowout miss
- explosive-offense miss
- rushing-control miss
- low-scoring control miss

Future model outcome should include:

```yaml
outcome_quality:
  - correct_dominant
  - correct_narrow
  - correct_low_scoring_control
  - incorrect_close
  - incorrect_blowout
  - incorrect_wrong_profile
  - no_pick_validated
```

Product value:

- Better trust
- Better postgame review
- Better calibration tracking
- Less emotional overreaction to close misses
- Clearer distinction between “bad model miss” and “football variance”

---

### 4. High-Confidence Misses Need Severity Labels

QA showed that not all high-confidence misses are equal.

Example types:

```markdown
High-confidence close miss:
The model had the right broad idea, but the game flipped on late execution, turnovers, or kicking.

High-confidence blowout miss:
The model had the wrong matchup profile, and the final result strongly contradicted the read.

High-confidence low-scoring miss:
The favorite had the cleaner profile, but the opponent dragged the game into a control/variance environment.

High-confidence explosive-offense miss:
The model favored one team’s season profile, but the opponent’s current offensive form overwhelmed the matchup.
```

Future desired shape:

```json
{
  "model_outcome": {
    "result": "Incorrect",
    "miss_severity": "high_confidence_blowout_miss",
    "reason_code": "explosive_offense_miss",
    "reason_summary": "The model favored IND, but SF's current offensive form and explosive scoring overwhelmed the matchup profile."
  }
}
```

---

### 5. Postgame Swing Factors Should Be Added

GameLens should explain what actually swung the final result.

Possible swing factors:

```markdown
- turnover_swing
- defensive_pressure
- rushing_control
- passing_explosiveness
- scoring_efficiency
- red_zone_execution
- kicking_swing
- special_teams_swing
- low_scoring_control
- late_game_execution
```

Future desired shape:

```json
{
  "postgame_review": {
    "outcome_quality": "no_pick_validated",
    "swing_factors": [
      {
        "code": "turnover_swing",
        "label": "Turnover swing",
        "team": "SEA",
        "summary": "SEA forced three turnovers while committing none."
      },
      {
        "code": "rushing_control",
        "label": "Rushing control",
        "team": "SEA",
        "summary": "SEA controlled the ground game and kept NE chasing the game."
      },
      {
        "code": "defensive_pressure",
        "label": "Defensive pressure",
        "team": "SEA",
        "summary": "SEA pressure disrupted NE's passing game and created negative plays."
      }
    ]
  }
}
```

Important rule:

```markdown
Postgame swing factors may use final box score data.

Pregame matchup logic must not.
```

---

### 6. Pregame Logic Needs Profile Weights

The current Game Profile shows signal level:

```markdown
Pressure: Moderate
Turnover Risk: Elevated
Scoring Efficiency: Moderate
```

The next improvement is to show how much each signal should matter in that specific matchup.

Future concept:

```markdown
Pressure
Level: Moderate
Weight Today: Medium
Tilt: NE generating more pressure
Why it matters: Pressure favors NE, but the edge is not strong enough to drive the matchup alone.

Turnover Risk
Level: Elevated
Weight Today: High
Tilt: NE better turnover profile
Why it matters: Turnover edge aligns with scoring efficiency and confidence.

Scoring Efficiency
Level: Moderate
Weight Today: Medium
Tilt: SEA more efficient scoring
Why it matters: SEA has efficiency upside, but the broader Core Area profile is mixed.
```

Future desired shape:

```json
{
  "profile_weights": {
    "pressure": {
      "weight": "medium",
      "score": 0.58,
      "favored_side": "home",
      "reason": "Pressure favors NE, but the edge is not large enough to drive the matchup alone."
    },
    "turnover_risk": {
      "weight": "high",
      "score": 0.76,
      "favored_side": "home",
      "reason": "NE has the cleaner turnover profile and it aligns with scoring efficiency."
    },
    "scoring_efficiency": {
      "weight": "medium",
      "score": 0.62,
      "favored_side": "away",
      "reason": "SEA is more efficient, but the broader Core Area profile is mixed."
    }
  }
}
```

Product value:

```markdown
The user does not only see what the signal is.
They understand how much that signal should matter today.
```

---

### 7. Rushing / Control Is A Repeated Blind Spot

Across multiple QA batches, games were often decided by rushing control, low-scoring control, or offensive volume even when season-average comparison favored the other team.

Observed pattern:

```markdown
Favorite has cleaner season profile.
Opponent has credible rushing/control path.
Game stays low scoring.
Turnovers, field goals, or late execution decide it.
High confidence becomes overstated.
```

Future caution flag:

```json
{
  "game_script_caution": {
    "active": true,
    "code": "rushing_control_path",
    "team": "CAR",
    "summary": "CAR has a plausible rushing/control path that could reduce confidence in GB's broader edge."
  }
}
```

This should not automatically flip the lean.

It should:

- reduce confidence
- soften Matchup Lean wording
- add a caution note
- improve postgame review if the control path appears

---

### 8. Team Comparison Can Overstate Certainty

Team Comparison is useful, but it can visually overstate confidence when shown as a simple count.

Example risk:

```markdown
Team Comparison:
Panthers 0
Packers 5
```

A user may read that as:

```markdown
This should be a lock.
```

But QA showed that a team can win Team Comparison 5–0 and still lose a low-scoring control game.

Future tooltip or label:

```markdown
Team Comparison shows visible season metric edges only. It is supporting context, not the full model score.
```

---

### 9. Defensive Control Deserves More Respect In Low-Scoring / Playoff Games

QA repeatedly showed that Defensive Control can matter more when:

- the game is low-scoring
- the game is playoff/high-leverage
- margins are compressed
- one team has better offensive output but cannot finish drives
- pressure and turnovers are noisy

Future rule idea:

```markdown
If game_context is playoff_or_high_leverage
AND Defensive Control strongly favors one side
AND Offensive Output is split or noisy
THEN increase Defensive Control weight.
```

This should improve:

- Matchup Lean
- Game Profile signal weighting
- Model Trust reasoning
- Postgame explanation

---

## Month-by-Month Drift

QA suggested that model behavior shifted as the season progressed.

This is not proof that the model is broken.

It suggests that season-to-date aggregates become less sufficient later in the season unless paired with recent form and context.

---

### September / Early Season

Too little sample from current QA to draw a strong conclusion.

Current rule:

```markdown
Avoid overreacting to early-season games.
Early-season aggregates may be noisy.
```

---

### October

October contained many mixed profiles.

Observed pattern:

```markdown
The model often saw signal direction, but Core Areas were messy.
Low Confidence was doing its job.
```

Key lesson:

```markdown
Conflict detection matters.
Do not force a lean when signal support and Core Areas disagree.
```

---

### November

November reinforced rushing/control and low-scoring variance.

Observed pattern:

```markdown
A team can lose the passing/stat profile but win through rushing, defense, field position, and low-scoring control.
```

Key lesson:

```markdown
High Confidence needs a check for low-scoring control risk.
```

---

### December

December showed the clearest late-season drift.

Observed pattern:

```markdown
Season aggregates can lag current team form.
Explosive offenses or surging teams can overwhelm a season-long profile.
```

Key lesson:

```markdown
Before awarding High Confidence late in the season, the model needs a recent-form / explosive-upside check.
```

---

### January / Playoffs

January showed GameLens remained directionally useful in higher-leverage games, but confidence labels needed margin and context.

Observed pattern:

```markdown
Correct high-confidence picks can still be narrow.
Correct picks can still be low-scoring.
Playoff games can compress margins.
Defense, kicking, turnovers, and late-game execution matter heavily.
```

Key lesson:

```markdown
Correctness is not enough.
Outcome quality matters.
```

---

## Super Bowl QA Learning

The Super Bowl was reviewed as a capstone case.

Game:

```markdown
20260208_SEA@NE
Seattle Seahawks 29
New England Patriots 13
```

GameLens stance:

```markdown
No Pick / Low Confidence
```

QA read:

```markdown
Strong restraint.
The matchup profile was mixed enough that the model should not have forced a lean.
```

Postgame finding:

Seattle did not win because the offense exploded.

Seattle won because:

- defensive pressure
- turnovers
- rushing control
- kicking
- defensive touchdown

Important swing factors:

```markdown
SEA forced three turnovers.
SEA committed zero turnovers.
SEA produced six sacks.
SEA generated a defensive touchdown.
SEA controlled rushing volume.
SEA went 5/5 on field goals.
```

Product lesson:

```markdown
No Pick was correct product behavior, even though SEA won by 16.

The model avoided overclaiming in a mixed-profile championship game.
```

Future postgame outcome label:

```markdown
No Pick validated — mixed profile, defensive swing decided game
```

Future `postgame_review` example:

```json
{
  "postgame_review": {
    "outcome_quality": "no_pick_validated",
    "reason_code": "defensive_turnover_swing",
    "reason_summary": "The pregame profile was mixed, and SEA won through defense, takeaways, rushing control, and kicking rather than a clean offensive mismatch."
  }
}
```

---

## Data Boundary

Pregame and postgame data must remain separate.

This is a core trust rule.

---

### Pregame Inputs

Pregame logic may use only data available before kickoff:

```markdown
- season-to-date metrics before the game
- rolling last_3_games before the game
- rolling last_7_games before the game
- opponent strength before the game
- schedule / week / season phase
- team-level aggregate metrics
```

Do not include the game being evaluated.

---

### Postgame Inputs

Postgame review may use final-game data:

```markdown
- final score
- actual winner
- margin
- final game box score
- turnover margin
- sacks
- rushing control
- passing efficiency
- kicking results
- special teams events
- red zone and third down results if available
```

Important rule:

```markdown
Do not let postgame data leak into pregame Matchup Lean.
```

---

## Updated Product Direction After QA

The next evolution of GameLens should focus on three connected layers.

---

### Pregame

Improve:

- signal weighting
- confidence calibration
- recent form checks
- game context
- rushing/control caution
- playoff/high-leverage caution
- explosive offense warning

Pregame should answer:

```markdown
What does the model see?
Which signals matter most today?
Are there caution flags?
Is confidence supported or fragile?
```

---

### Postgame

Improve:

- outcome quality
- swing factors
- reason codes
- miss severity
- no-pick validation
- narrow/dominant distinction

Postgame should answer:

```markdown
Was the model right?
Was it right for the right reasons?
If wrong, was it a close miss or a true calibration miss?
What swing factors decided the game?
```

---

### UI

Improve visualization of:

- signal level
- signal weight
- profile conflict
- confidence caution
- outcome quality
- postgame swing factors

UI should help users understand:

```markdown
Not only who has the edge, but why that edge matters and how strong the evidence really is.
```

---

# 🔜 Proposed — Next Phases

V1 is published and privately accessible.

The next work should focus on polish, clarity, and model depth rather than adding big new systems immediately.

Post-QA, the roadmap priority shifts toward:

```markdown
1. Outcome quality
2. Postgame swing factors
3. Pregame profile weights
4. Recent-form sanity checks
5. Game context flags
6. Margin-aware confidence
```

---

# 🧭 Phase 8 — Auth Polish + Session UX

## Objective

Improve edge-case auth behavior.

Possible work:

- Better session-expired state
- Better unauthorized-user message
- Cleaner redirect after backend 401
- Cleaner message after backend 403
- Optional user-facing “request access” flow
- Optional admin invite workflow

## Status

Partially complete.

Safe error mapping is implemented.

Future polish can improve UX further.

## Priority

Low / Medium

---

# 🧭 Phase 9 — Team Comparison Formatting

## Objective

Move display formatting decisions into the backend.

Current Team Comparison shape:

```yaml
team_comparison:
  - label: "Points per Play"
    away: 0.308
    home: 0.246
    better: "away"
```

Future desired shape:

```yaml
team_comparison:
  - label: "Points per Play"
    away: 0.308
    home: 0.246
    away_display: "0.308"
    home_display: "0.246"
    format: "decimal"
    decimals: 3
    better: "away"
    formatted_gap: "0.308 vs 0.246"
```

## Product Value

- Cleaner UI
- Less frontend formatting logic
- Better consistency
- Easier future metric expansion

## Status

Not started.

## Priority

Low / Medium

---

# 🧭 Phase 10 — Outcome Quality Labels

## Objective

Make postgame evaluation more nuanced than Correct / Incorrect / No Pick.

Current Model Outcome:

```yaml
model_outcome:
  actual_winner: "SF"
  predicted_team: "NO"
  result: "Incorrect"
```

Future desired shape:

```yaml
model_outcome:
  actual_winner: "SF"
  predicted_team: "NO"
  result: "Incorrect"
  outcome_quality: "incorrect_close"
  miss_severity: "low_confidence_balanced_miss"
  reason_code: "balanced_profile_miss"
  reason_summary: "The model leaned NO, but Core Areas were nearly even and SF won."
```

Possible `outcome_quality` values:

```yaml
outcome_quality:
  - correct_dominant
  - correct_narrow
  - correct_low_scoring_control
  - incorrect_close
  - incorrect_blowout
  - incorrect_wrong_profile
  - no_pick_validated
```

## Product Value

- Better model trust
- Better learning loop
- More useful postgame review
- Clearer model improvement path
- Distinguishes close variance from true calibration failure

## Status

Not started.

## Priority

High

---

# 🧭 Phase 11 — Postgame Swing Factors

## Objective

Explain what actually decided the final game.

Postgame swing factors should use final game data.

They should not influence pregame logic for that same game.

Possible swing factors:

```yaml
swing_factors:
  - turnover_swing
  - defensive_pressure
  - rushing_control
  - passing_explosiveness
  - scoring_efficiency
  - red_zone_execution
  - kicking_swing
  - special_teams_swing
  - low_scoring_control
  - late_game_execution
```

Future desired shape:

```json
{
  "postgame_review": {
    "outcome_quality": "incorrect_close",
    "swing_factors": [
      {
        "code": "kicking_swing",
        "label": "Kicking swing",
        "team": "LAC",
        "summary": "LAC converted key field goals while PHI left points on the field."
      },
      {
        "code": "turnover_swing",
        "label": "Turnover swing",
        "team": "LAC",
        "summary": "PHI's turnovers created enough leverage for LAC to win a balanced game."
      }
    ]
  }
}
```

## Product Value

- Explains why a game flipped
- Turns box score into story
- Helps users trust the model even after misses
- Creates structured learning labels for historical validation

## Data Source

Likely ingredients already exist or can be derived from `game_metrics_flat`, including:

```markdown
- turnover_margin
- defensive_interceptions
- fumbles_lost
- fumbles_recovered
- sacks
- pressure_rate
- rushing_yards
- rushing_attempts
- yards_per_rush
- points_per_play
- points_allowed_per_play
- red_zone_efficiency
- third_down_pct
- time_of_possession
```

## Status

Not started.

## Priority

High

---

# 🧭 Phase 12 — Pregame Profile Weights

## Objective

Improve Game Profile Signals so the user understands not only what signal exists, but how much that signal should matter today.

Current Game Profile:

```yaml
game_profile:
  - category: "Pressure"
    level: "Moderate"
    tilt_text: "NE generating more pressure"
```

Future desired Game Profile:

```yaml
game_profile:
  - category: "Pressure"
    level: "Moderate"
    weight: "medium"
    weight_score: 0.58
    tilt_team: "home"
    tilt_text: "NE generating more pressure"
    weight_reason: "Pressure favors NE, but the edge is not large enough to drive the matchup alone."
```

Possible `profile_weights` object:

```json
{
  "profile_weights": {
    "pressure": {
      "weight": "medium",
      "score": 0.58,
      "favored_side": "home",
      "reason": "Pressure favors NE, but the edge is not large enough to drive the matchup alone."
    },
    "turnover_risk": {
      "weight": "high",
      "score": 0.76,
      "favored_side": "home",
      "reason": "NE has the cleaner turnover profile and it aligns with scoring efficiency."
    },
    "scoring_efficiency": {
      "weight": "medium",
      "score": 0.62,
      "favored_side": "away",
      "reason": "SEA is more efficient, but the broader Core Area profile is mixed."
    }
  }
}
```

## Product Value

The user can understand:

```markdown
This signal exists.
This team has the edge.
This is how much the signal should matter today.
This is why the model weighted it that way.
```

## UI Direction

Possible display:

```markdown
Pressure
Level: Moderate
Weight Today: Medium
Tilt: NE generating more pressure
Why it matters: Pressure favors NE, but it is not strong enough alone.
```

## Status

Not started.

## Priority

High

---

# 🧭 Phase 13 — Recent Form / Rolling Window Sanity Check

## Objective

Prevent stale season-to-date aggregates from overstating late-season confidence.

QA showed that season averages are useful, but they can drift later in the season.

Future model should compare:

```markdown
this_season
last_7_games
last_3_games
```

If season profile and recent form disagree, confidence should be adjusted.

Future desired shape:

```json
{
  "recent_form_check": {
    "active": true,
    "season_leader": "IND",
    "recent_form_leader": "SF",
    "conflict": true,
    "confidence_adjustment": "downgrade",
    "summary": "Season-long metrics favor IND, but recent form creates volatility around the edge."
  }
}
```

## Product Value

- Better late-season calibration
- Better high-confidence filtering
- Reduced blowout misses
- Better handling of surging teams
- Better explanation for December / January games

## Status

Not started.

## Priority

High / Medium

---

# 🧭 Phase 14 — Game Context Flags

## Objective

Add lightweight schedule/season context so confidence can adapt to the type of game.

Game context examples:

- early season
- midseason
- late regular season
- Week 18
- Wild Card
- Divisional Round
- Conference Championship
- Super Bowl
- playoff/high-leverage game
- possible lower-margin environment

Future desired shape:

```json
{
  "game_context": {
    "season_phase": "playoffs",
    "round": "Wild Card",
    "stakes_level": "high",
    "context_flags": [
      "playoff_game",
      "higher_leverage",
      "lower_margin_expected"
    ],
    "confidence_note": "Higher-leverage games may play tighter than season profiles suggest."
  }
}
```

## Product Value

- More honest confidence
- Better margin expectations
- Better handling of playoff / elimination games
- Better user explanation

## Status

Not started.

## Priority

Medium

---

# 🔮 Future Enhancements

## League-Relative Core Area Scoring

Current Core Area scoring is matchup-relative.

Future improvement:

Compare each team to league context, not only to the opponent.

Product value:

- Better cross-game comparisons
- Stronger confidence interpretation
- Clearer understanding of whether a team is actually strong

---

## Core Area Drilldowns

Allow users to expand a Core Area and see why that category favored a team.

Example:

```markdown
Disruption and Turnovers:

- pressure profile
- turnover margin
- interceptions
- sacks
- related defensive signals
```

Product value:

- More transparency
- Optional depth
- Better trust without cluttering main view

---

## Metric Weighting

Not every metric should matter equally.

Future scoring may weight metrics differently based on importance and predictive value.

Product value:

- Better model quality
- Less noise
- Better confidence calibration

---

## Historical Model Validation

Track model behavior over time.

Questions to answer:

```markdown
How often are low-confidence leans correct?
Are coin-flip profiles actually close to 50/50?
Which Core Area patterns create the most misses?
Does signal alignment predict outcome quality?
Which profile types need calibration?
Which swing factors explain the most misses?
Which confidence tiers are overconfident?
Does recent form improve high-confidence filtering?
```

Product value:

- Turns misses into learning
- Improves future confidence rules
- Creates a real feedback loop

---

## Postgame QA Dashboard

Possible future dashboard for internal use.

Views:

```markdown
- Outcome quality by month
- High-confidence miss severity
- Low-confidence lean accuracy
- No Pick validation rate
- Core Area split outcomes
- Recent form conflict outcomes
- Swing factor frequency
- Rushing/control miss frequency
- Explosive-offense miss frequency
```

Status:

Future / internal tool

---

## Custom Auth Domain Branding

Current Google Sign-In popup may show:

```markdown
nfl-stream-406420.firebaseapp.com
```

Future desired behavior:

```markdown
Sign in to GameLens.io
```

Why parked:

Authentication works now.

Custom auth domain branding requires extra Firebase Hosting / DNS / OAuth redirect configuration.

Status:

Back burner / polish

---

## CORS Restriction

Current behavior may allow broad CORS origins during development.

Future desired behavior:

Restrict CORS to:

```markdown
gamelens.io
www.gamelens.io
Lovable preview domain
```

Why parked:

Protected routes already require Firebase token validation.

Do not destabilize working auth during V1 launch.

Status:

Future hardening

---

# 🧊 Back Burner Ideas

These ideas came up during planning but should not distract from the current roadmap.

---

## Radar / Spider Chart for Core Areas

Original idea:

Use a radar or spider chart to compare home vs away teams across Core Areas.

Why parked:

- Compact Core Area cards are easier to read
- Radar charts can exaggerate small differences
- The matchup page already contains a lot of information
- Clarity mattered more than visual flair for V1

Future use case:

Optional advanced visualization on desktop or in expanded analytics view.

Status:

Back burner

---

## Raw Metric Detail Tooltips

Idea:

Expose more raw metric values inside tooltips or expanded views.

Why parked:

The main UI should avoid raw metric overload.

Future use case:

Advanced mode, debugging, or optional detail expansion.

Status:

Back burner

---

## User-Specific Saved Views

Idea:

Allow users to save preferences or views.

Possible examples:

- Favorite teams
- Preferred matchup sections
- Compact vs detailed display
- Saved games
- Hidden sections
- Preferred confidence filters

Why parked:

Private auth exists now, but user-specific product behavior should wait until the core experience matures.

Status:

Back burner

---

## Guest Mode

Idea:

Allow limited app access without signing in.

Why parked:

The current priority is protecting access and cloud costs.

Future use case:

Public demo mode with limited games or static examples.

Status:

Back burner

---

## Admin / Power User Mode

Idea:

Create a detailed internal view for debugging model behavior.

Possible features:

- Raw API response inspection
- Model scoring details
- Hidden profile fields
- Feedback insert status
- Data freshness indicators
- Firestore allowed-user management
- Postgame swing factor inspection
- Pregame vs postgame data comparison
- Recent form / season aggregate comparison

Why parked:

The main user experience should stay clean.

Status:

Back burner

---

## Historical Accuracy Dashboard

Idea:

Create a dashboard showing how the model performs over time.

Possible views:

- Correct vs incorrect by confidence tier
- Profile type accuracy
- Low-confidence lean performance
- Coin-flip profile outcomes
- Signal alignment accuracy
- Core Area split performance
- High-confidence miss severity
- No Pick validation rate
- Swing factor frequency

Why parked:

The app first needed structured model outcomes and better explanation language.

Status:

Back burner, but high long-term value

---

## Betting Decision Layer

Idea:

Eventually connect the explanation layer to a betting rubric or decision engine.

Why parked:

The Matchup API is not ready to be a betting recommendation engine yet.

Current rule:

```markdown
Explanation Layer first.
Decision Layer later.
```

Status:

Back burner / separate future system

---

## Mobile Optimization Pass

Idea:

Refine the Matchup Page specifically for mobile.

Why parked:

The current focus was desktop layout, API structure, explanation correctness, and private V1 publishing.

Status:

Back burner

---

## Visual Design Polish Pass

Idea:

Revisit spacing, colors, section hierarchy, and visual rhythm across the whole Matchup Page.

Possible polish areas:

- Confidence badges
- Section spacing
- Core Area colors
- Signal styling
- Outcome states
- Empty states
- Loading states
- Help modal spacing
- Calendar behavior
- Historical date selection UX
- Postgame outcome quality labels
- Profile weight visualization

Status:

Back burner

---

# ⚠️ Known Watchouts

## Core Area Scores Are Matchup-Relative

Current Core Area scores compare only the two teams in the game.

They do not yet say whether either team is strong compared to the full league.

This is acceptable for V1.

Future improvement:

```markdown
League-relative percentile scoring
```

---

## Metric Counts Are Uneven

Some Core Areas include more usable metrics than others.

Example:

```markdown
Offensive Output may have many metrics.
Defensive Control may have fewer.
Special Teams may sometimes have none.
```

This is acceptable for V1.

Future improvement:

```markdown
Metric weighting and category balancing
```

---

## Special Teams May Not Always Appear

Field Control / Special Teams only appears when usable data exists.

If all Special Teams values are empty or zero-vs-zero, the API may omit that Core Area.

This is intentional.

Do not force Special Teams into the UI unless the API returns it.

---

## Do Not Render Raw Objects in the Frontend

Structured objects must be formatted into readable text before rendering.

Bad:

```markdown
Render core_area_context directly
```

Good:

```markdown
Core Areas were split 2–2 and nearly even overall.
```

This avoids React rendering errors and keeps the UI clean.

---

## Team Comparison Is Supporting Context

Team Comparison is not the full model score.

It is a visible comparison count based on selected season metrics.

Risk:

```markdown
A 5–0 Team Comparison can visually imply certainty.
```

Future improvement:

```markdown
Add tooltip / label:
"Visible season metric comparison only — not the full model score."
```

---

## Pressure Is Useful But Noisy

Pressure can help validate disruption, but it does not reliably predict the winner alone.

Pressure should generally be treated as:

```markdown
supporting signal
```

Not:

```markdown
standalone winner signal
```

---

## Turnover Risk Is Useful But Volatile

Turnover profile can matter a lot, but turnovers are high-variance.

Turnover Risk should be strongest when it aligns with:

- scoring efficiency
- defensive control
- offensive output
- game context
- recent form

---

## Pregame / Postgame Data Must Stay Separate

Pregame logic must only use data available before kickoff.

Postgame review can use final box score and final game metrics.

Bad:

```markdown
Using final game box score to explain pregame Matchup Lean.
```

Good:

```markdown
Using final game box score only for postgame swing factors and outcome review.
```

---

## Python Version Compatibility

Cloud Run previously ran Python 3.9 while local dev used Python 3.12.

One issue was caused by newer typing syntax:

```python
dict | None
```

Python 3.9-safe version:

```python
Optional[dict]
```

Future improvement:

Upgrade Cloud Run runtime/container to Python 3.10+ or 3.12.

---

## Firebase ID Tokens Are Temporary Credentials

Firebase ID tokens should not be pasted into chats, logs, or public places.

They expire, but while active they behave like temporary signed-in credentials.

---

## Pregame / Postgame Data Separation

Pregame model logic must use an as-of cutoff before kickoff.

Postgame review may use the final game box score.

The same game’s final metrics must never influence its own pregame
Matchup Lean,
Game Profile,
Core Area Advantage, or Confidence.

---

Early-Season Context + Confidence Cap
Objective

Improve GameLens behavior for Week 1 through Week 4 games, where current-season sample size is limited and season averages can be unstable or misleading.

Early-season games should be handled differently from midseason, late-season, and playoff games because the model may not have enough current-year evidence to support strong confidence.

Why This Matters

September QA showed that GameLens was mostly cautious, which is good.

However, early-season games create a unique trust issue:

Week 1 and Week 2 may not have enough completed current-season games to support normal season-average confidence.

This is especially important for historical QA because the full season data already exists in the database.

The API must make sure it does not accidentally use future games when generating pregame logic for early-season matchups.

Key Finding From September QA

September was not necessarily a model failure.

The better finding is:

September needs early-season context because confidence and season-average metrics are fragile until enough current-year games exist.

GameLens behaved responsibly in many September games by using Low Confidence, but the UI and API should make the limited sample more obvious.

Early-Season Product Rule
Early-season games should carry a context flag when current-season sample size is limited.

Confidence should be capped or softened until enough completed current-season games exist.
Suggested Confidence Guardrail
Weeks 1–2:

- Max confidence should usually be Low
- Only allow Medium or High if there is a validated prior-season baseline and an extreme matchup edge

Weeks 3–4:

- Max confidence should usually be Medium
- Only allow High if multiple signals, Core Areas, and profile weights strongly align

Week 5+:

- Normal confidence rules can begin
  Suggested API Shape
  {
  "game_context": {
  "season_phase": "early_regular_season",
  "week": 1,
  "context_flags": [
  "early_season",
  "limited_current_season_sample"
  ],
  "confidence_note": "Current-season sample is limited, so confidence is capped unless the matchup edge is extremely strong."
  }
  }
  Suggested Matchup Lean Impact

Early-season context should be allowed to reduce confidence.

Example:

{
"matchup_lean": {
"target_team": "NE edge",
"confidence": "Low",
"confidence_context": "Early-season sample is limited, so confidence is capped despite NE showing the cleaner profile."
}
}
Suggested Team Comparison Label

Current label:

Season averages

Future early-season label:

Season averages — limited sample

or:

Early-season sample

For Week 1, if using prior-season or baseline data:

Pregame baseline — limited current-season data
Data Boundary Rule

Early-season games make the pregame/postgame separation rule even more important.

For pregame logic:

Use only games completed before the target game kickoff.

For Week 1:

Current-season pregame sample may be empty.

Therefore the API must either:

1. Use a clearly labeled prior-season baseline
2. Use limited-sample current-season data
3. Cap confidence
4. Avoid presenting season averages as more certain than they are
   Backend Rule
   WHERE season = target_season
   AND team IN (away_team, home_team)
   AND game_datetime_est < target_game_datetime_est

This cutoff must apply to:

- Game Profile Signals
- Core Area Advantage
- Matchup Lean
- Confidence
- Pregame Profile Weights
- Recent Form Checks
- Team Comparison
  Product Value

This improves trust by making GameLens more honest about what it knows early in the season.

Users should understand:

The model may see a lean, but the sample is still thin.

---

# Add To Roadmap: Metric Category Consistency Audit

Yes — I agree. This should be a **foundation item**, because Core Areas, Game Profile Signals, profile weights, and postgame swing factors all depend on clean metric categorization.

## Recommended Roadmap Name

Metric Taxonomy / Category Consistency Audit

## Why It Matters

Before improving weights or swing factors, we need to confirm that every metric used from `game_metric_flat` maps cleanly to the correct:

- metric name
- category
- core area
- raw vs derived status
- offensive / defensive / special teams context
- higher-is-better or lower-is-better direction

## What To Check

- Every active metric has exactly one canonical category
- Every active metric has exactly one canonical core area
- No duplicate metric names with conflicting categories
- No missing category values
- No missing core area values
- No stale/fake metrics still referenced
- `game_metric_flat` fields match the metric metadata/config
- API Core Area logic uses the same category names as the data layer
- Frontend labels match backend labels
- Special Teams / Field Control metrics are only included when usable

# Updated GameLens Priority Order

1. Pregame / Postgame Data Separation

2. ETL Observability / Run Logging

3. Metric Taxonomy / Category Consistency Audit

4. Outcome Quality Labels

5. Postgame Swing Factors

6. Pregame Profile Weights

7. Recent Form / Rolling Window Sanity Check

8. Game Context Flags

9. Early-Season Context + Confidence Cap

10. Margin-Aware Confidence Calibration

11. Team Comparison Formatting / Tooltip Polish

12. Auth Polish / Session UX

13. League-Relative Core Area Scoring

14. Historical Validation Dashboard

# Recommended Near-Term Focus

1. Pregame / Postgame Data Separation

2. ETL Observability / Run Logging

3. Metric Taxonomy / Category Consistency Audit

# Why These Are First

These three protect the foundation.

Before GameLens gets smarter, it needs to guarantee:

- Pregame logic is not seeing postgame data
- ETL runs can be trusted and inspected
- Metrics mean the same thing across BigQuery, Python, API logic, and frontend labels

## Core Rule

Metric categories should be defined once and reused everywhere.

The API should not rely on slightly different category labels across:

- BigQuery views
- Python config
- metric descriptions
- Core Area logic
- frontend display labels

## Product Impact

If metric categories are inconsistent, GameLens can accidentally tell the wrong story.

Example risk:

- A pressure metric gets grouped under Defensive Control
- A scoring metric gets duplicated under Offensive Output
- A Special Teams metric appears when there is no usable data
- Core Area Advantage says one thing while Game Profile Signals imply another

## Final Note

This is not flashy, but it is important.

Before we tune the model, we should make sure the model is reading the same metric language everywhere.

---

# Updated GameLens Priority Order

1. Pregame / Postgame Data Separation

2. ETL Observability / Run Logging

3. Outcome Quality Labels

4. Postgame Swing Factors

5. Pregame Profile Weights

6. Recent Form / Rolling Window Sanity Check

7. Game Context Flags

8. Margin-Aware Confidence Calibration

9. Team Comparison Formatting / Tooltip Polish

10. Auth Polish / Session UX

11. League-Relative Core Area Scoring

12. Historical Validation Dashboard

Reasoning:

```markdown
Postgame swing factors help identify what actually decided games.

Those learnings can then improve pregame profile weights, recent-form checks, and confidence rules.
```

---

# 🧭 Final Objective

Build a system where:

- Backend defines truth
- Frontend displays it clearly
- Users understand the matchup instantly
- Model confidence stays honest
- Model misses become learning opportunities
- No Pick is respected as useful restraint
- Correctness is evaluated with outcome quality
- Pregame and postgame data stay cleanly separated
- Postgame swing factors explain what actually happened
- Pregame profile weights explain what matters most before kickoff
- Private access is protected
- Feedback improves future performance

GameLens should feel like:

```markdown
A clear, trustworthy NFL matchup explanation engine.
```

Not magic.  
Not hype.  
Not a black box.  
Just structured matchup intelligence that tells the truth.
