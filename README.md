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
- [🔜 Proposed — Next Phases](#-proposed--next-phases)
- [🧭 Phase 8 — Auth Polish + Session UX](#-phase-8--auth-polish--session-ux)
- [🧭 Phase 9 — Team Comparison Formatting](#-phase-9--team-comparison-formatting)
- [🧭 Phase 10 — Model Outcome Depth](#-phase-10--model-outcome-depth)
- [🧭 Phase 11 — Team Context](#-phase-11--team-context)
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

v1-private-auth

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

BigQuery should support the model, not become the full product reasoning layer.

---

## Python Services

Python services are responsible for:

- Matchup logic
- Signal scoring
- Core Area interpretation
- Confidence rules
- Matchup Lean language
- Model Trust reasoning
- Outcome evaluation
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

reasoning:
headline: "NO had a slight signal lean in a balanced matchup"
summary: "The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss."

### Key Outcomes

- Removed frontend-generated explanation text
- Reduced contradictions
- Added outcome-aware language
- Added profile-aware reasoning
- Improved storytelling across correct, incorrect, and no-pick outcomes

### Result

The system can explain:

What the model saw
Why it leaned that way
Whether the outcome validated or challenged that read

---

## 3. Signal Alignment System ✅ Complete

Signal Alignment explains whether the visible Game Profile signals agreed with the model’s predicted or leaned team.

Conceptual shape:

signal_alignment:
summary_code: "mixed"
summary_label: "Mixed signals — not all signals agreed"
aligned_count: 2
total_count: 3
signals: - category: "Pressure"
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

NO holds the cleaner matchup profile

Now:

NO had a slight signal lean in a balanced matchup

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

/game/20250914_SF@NO

Expected Core Area Advantage:

Defensive Control: NO edge
Disruption and Turnovers: NO edge
Offensive Output: SF edge
Scoring Efficiency: SF edge

Expected Core Area read:

Split 2–2
Nearly even overall

Expected Matchup Lean:

This matchup is close overall, with a slight lean toward NO.

Expected supporting line:

Core Areas were split 2–2 and nearly even overall.

Expected confidence:

Low

Expected Model Outcome:

Predicted: NO
Actual: SF
Result: Incorrect

Expected Model Trust headline:

NO had a slight signal lean in a balanced matchup.

Expected Model Trust summary:

The model leaned NO, but the broader profile was close enough that the final result exposed a useful calibration miss.

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
5. Frontend sends Authorization: Bearer <idToken> to backend API calls
6. Backend verifies Firebase ID token
7. Backend checks Firestore allowed_users collection
8. If active=true, API response is returned
9. If missing/invalid/not allowed, request is rejected

---

## Firestore Allowed Users

Firestore collection:

allowed_users

Document ID:

lowercase user email

Example:

allowed_users / csells10@gmail.com

Minimum required field:

active: true

Recommended fields:

email: "csells10@gmail.com"
active: true
role: "admin"
display_name: "Christian Sells"
notes: "Owner"
environment: "production"
uid: "pending"
created_by: "manual_firebase_console"

Required rule:

Document ID must match the signed-in email.
active must be boolean true.

To add a new allowed user:

1. Open Firebase Console
2. Go to Firestore Database
3. Open allowed_users
4. Add document
5. Use lowercase email as Document ID
6. Add active=true
7. Add role and notes if desired

To revoke access:

Set active=false

No redeploy required.

---

## Backend API Protection

Protected routes:

/games
/game/<game_id>

Expected behavior:

No token: 401 Unauthorized
Invalid token: 401 Unauthorized
Valid token but missing Firestore access: 403 Forbidden
Valid token and active allowed user: 200 OK

Public routes that remain open:

/health
/
/test

Note:

/ and /test support ingestion / scheduled workflows and should be treated carefully.

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

Direct unauthenticated Cloud Run request:
/game/20250914_SF@NO

Result:
401 Unauthorized
Missing Authorization Bearer token

Validated frontend behavior:

Allowed signed-in user can load /games
Allowed signed-in user can load /game/20250914_SF@NO
Firestore-added allowed user can log in successfully

Confirmed allowed user test:

Wife added to allowed_users
Wife successfully logged in

---

## Known Security Scan Note

Security scanner may still report:

Cloud Run Backend Auth Enforcement Cannot Be Verified Client-Side
Authorization Enforced Only by Unverified Backend Claim

Interpretation:

The scanner cannot verify backend route enforcement from frontend code alone.

Actual deployed backend behavior has been manually validated:

Unauthenticated direct API call returns 401.
Signed-in frontend with Firebase token succeeds.

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

Frontend Google Sign-In: Complete
Firestore allowed_users: Complete
Backend Firebase token validation: Complete
Cloud Run protected routes: Complete
Safe frontend error handling: Complete
Private V1 access: Complete

---

# ✅ Completed — Publishing + Branding V1

## Website Metadata

Recommended site title:

GameLens — NFL Matchup Intelligence

Recommended site description:

A smarter way to understand NFL matchups through team strengths, signal alignment, confidence context, and model trust.

---

## Icon and Social Preview

Custom GameLens icon created and used to replace the default Lovable icon.

Brand concept:

A dark navy sports analytics icon combining a lens, football cue, and rising data bars.

Social image concept:

Dark navy background, GameLens icon, title text “GameLens”, subtitle “NFL Matchup Intelligence”, subtle analytics/grid accents.

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

v1-private-auth

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

Re-trigger onboarding overlays

On Matchup Detail page:

Open “How to read this matchup” modal

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

# 🔜 Proposed — Next Phases

V1 is published and privately accessible.

The next work should focus on polish, clarity, and model depth rather than adding big new systems immediately.

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

---

# 🧭 Phase 9 — Team Comparison Formatting

## Objective

Move display formatting decisions into the backend.

Current Team Comparison shape:

team_comparison:

- label: "Points per Play"
  away: 0.308
  home: 0.246
  better: "away"

Future desired shape:

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

## Product Value

- Cleaner UI
- Less frontend formatting logic
- Better consistency
- Easier future metric expansion

## Status

Not started.

Priority:

Low / Medium

---

# 🧭 Phase 10 — Model Outcome Depth

## Objective

Make postgame evaluation more explanatory.

Current Model Outcome:

model_outcome:
actual_winner: "SF"
predicted_team: "NO"
result: "Incorrect"

Future desired shape:

model_outcome:
actual_winner: "SF"
predicted_team: "NO"
result: "Incorrect"
reason_code: "balanced_profile_miss"
reason_summary: "The model leaned NO, but Core Areas were nearly even and SF won."

## Product Value

- Better learning loop
- More useful postgame review
- Clearer model improvement path
- Better user trust

## Status

Not started.

Priority:

Medium

---

# 🧭 Phase 11 — Team Context

## Objective

Add lightweight recent performance context.

Possible context:

- Recent games
- Wins/losses
- Opponent strength
- Score trends
- Recent form direction

Conceptual shape:

recent_form:
away: - opponent: "SEA"
result: "W"
score: "24-20"

home: - opponent: "ATL"
result: "L"
score: "21-17"

## Frontend Direction

Keep lightweight:

- Small strip
- Compact card
- Expandable section
- Avoid clutter

## Product Value

- Adds trust
- Helps validate model reads
- Gives context without overwhelming the page

## Status

Not started.

Priority:

Future

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

Disruption and Turnovers:
pressure profile
turnover margin
interceptions
sacks
related defensive signals

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

How often are low-confidence leans correct?
Are coin-flip profiles actually close to 50/50?
Which Core Area patterns create the most misses?
Does signal alignment predict outcome quality?
Which profile types need calibration?

Product value:

- Turns misses into learning
- Improves future confidence rules
- Creates a real feedback loop

---

## Custom Auth Domain Branding

Current Google Sign-In popup may show:

nfl-stream-406420.firebaseapp.com

Future desired behavior:

Sign in to GameLens.io

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
gamelens.io
www.gamelens.io
Lovable preview domain

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

Explanation Layer first.
Decision Layer later.

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

Status:

Back burner

---

# ⚠️ Known Watchouts

## Core Area Scores Are Matchup-Relative

Current Core Area scores compare only the two teams in the game.

They do not yet say whether either team is strong compared to the full league.

This is acceptable for V1.

Future improvement:

League-relative percentile scoring

---

## Metric Counts Are Uneven

Some Core Areas include more usable metrics than others.

Example:

Offensive Output may have many metrics.
Defensive Control may have fewer.
Special Teams may sometimes have none.

This is acceptable for V1.

Future improvement:

Metric weighting and category balancing

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

Render core_area_context directly

Good:

Core Areas were split 2–2 and nearly even overall.

This avoids React rendering errors and keeps the UI clean.

---

## Python Version Compatibility

Cloud Run previously ran Python 3.9 while local dev used Python 3.12.

One issue was caused by newer typing syntax:

dict | None

Python 3.9-safe version:

Optional[dict]

Future improvement:

Upgrade Cloud Run runtime/container to Python 3.10+ or 3.12.

---

## Firebase ID Tokens Are Temporary Credentials

Firebase ID tokens should not be pasted into chats, logs, or public places.

They expire, but while active they behave like temporary signed-in credentials.

---

# 🎯 Updated PM Recommended Order

Current recommended order after V1:

1. Pause and collect real usage feedback
2. Auth polish / session UX only if needed
3. Team Comparison formatting
4. Model Outcome depth
5. Team Context / Recent Form
6. Historical validation dashboard
7. League-relative Core Area scoring
8. Future betting decision layer

---

# 🧭 Final Objective

Build a system where:

- Backend defines truth
- Frontend displays it clearly
- Users understand the matchup instantly
- Model confidence stays honest
- Model misses become learning opportunities
- Private access is protected
- Feedback improves future performance

GameLens should feel like:

A clear, trustworthy NFL matchup explanation engine.

Not magic.  
Not hype.  
Not a black box.  
Just structured matchup intelligence that tells the truth.
