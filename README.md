# 🧠 Matchup API — Product Roadmap & Architecture

This document defines the current state, completed work, and future direction of the Matchup Page API.

The system is evolving from a **matchup explanation engine** into a structured, backend-driven **analysis and evaluation system**, while keeping all logic centralized, consistent, and testable.

---

# 🧭 SYSTEM OVERVIEW

## Current Purpose

The `/game/<game_id>` endpoint is responsible for:

- Explaining matchup dynamics between two teams
- Identifying which team has the structural edge
- Evaluating whether the model prediction was correct (postgame)
- Persisting results for feedback and improvement

This is an **Explanation Layer**, not a betting decision engine.

---

# ⚖️ KEY DISTINCTION

Matchup API = Explanation Layer  
Rubric (future) = Decision Layer

These should NOT be merged prematurely.

---

# 🧠 ARCHITECTURE PRINCIPLE

Views feed the model.  
Python is the model.

## BigQuery Views

Used for:

- Table joins
- Latest metrics selection
- Normalized inputs
- Reusable datasets

## Python Services

Responsible for:

- Matchup logic
- Confidence rules
- Model Trust reasoning
- Outcome evaluation
- Feedback loop (BigQuery inserts)

---

# 🚫 GUIDING RULES

- All logic lives in the backend
- Frontend renders only structured fields
- No string matching
- No inferred logic
- No duplicated calculations

---

# ✅ COMPLETED — CORE SYSTEM

## 1. Model Trust System (End-to-End) ✅ COMPLETE

Fully implemented across backend, API, UI, and BigQuery.

model_trust:
reasoning:
headline: "..."
summary: "..."
has_content: true
drivers: []
matchup_advantage:
visible: true
away: 2
home: 4
leader: "home"
tooltip: "..."
edge:
strength: "moderate"
score: 0.62
tooltip: "..."
has_content: true
signal_alignment:
summary_code: "mixed"
summary_label: "..."
aligned_count: 2
total_count: 4
tooltip: "..."
signals: []
learning_label: "..."

### Key Outcomes

- Backend owns all reasoning and interpretation
- Frontend no longer derives logic
- Results are stored in BigQuery
- Model Trust UI only appears for final games
- reasoning.summary fully integrated and rendered in UI
- No-pick scenarios handled cleanly with consistent messaging

---

## 2. Reasoning Summary (Explanation Layer) ✅ COMPLETE

reasoning:
headline: "..."
summary: "..."

### Key Outcomes

- Removed frontend-generated explanation text
- Eliminated contradictions ("Driven primarily by...")
- Introduced variation engine (Mad Libs style)
- Ensured consistent storytelling across all outcomes

### Result

[What happened]  
[Why it happened]

---

## 3. Signal Alignment System ✅ COMPLETE

signal_alignment:
summary_code: "..."
summary_label: "..."
signals: []

### Key Outcomes

- Clean handling of:
  - Correct
  - Incorrect
  - No Pick (not_applicable)

- Improved messaging:

Signals were mixed and did not support a confident prediction

- No fake alignment or forced evaluation

---

## 4. Game Profile — Backend Signal Ownership ✅ COMPLETE

game_profile:

- category: "Pressure"
  level: "Moderate"
  level_index: 1
  tilt_team: "home"
  tilt_text: "..."

### Key Outcomes

- Backend defines:
  - icon
  - level_index
  - tilt_team
  - tilt_text

- Frontend renders structured signals only
- No parsing or inference

---

## 5. Frontend Alignment ✅ COMPLETE

### Changes

- Removed frontend explanation generation
- Inserted reasoning.summary under headline
- Introduced consistent styling:

Correct → Green  
No Pick → Soft Amber  
Incorrect → Red

### Result

- No contradictions
- Clear hierarchy
- Explanation feels intentional

---

# 🔜 PROPOSED — NEXT PHASES

---

# 🧭 PHASE 4 — CORE AREA DATA USAGE (HIGH IMPACT) 🟡 PARTIALLY COMPLETE

## Objective

Introduce a category-level comparison layer using Core Areas:

- Defensive Control
- Disruption and Turnovers
- Offensive Output
- Scoring Efficiency
- Field Control (Special Teams)

This layer helps users understand broader matchup strengths before reading the final Matchup Lean.

---

## Backend Concept

core_area_comparison:

- core_area: "Defensive Control"
  away_score: 0.333
  home_score: 0.667
  leader: "home"
  metric_count: 6

---

## Completed Backend/API Work

- Added `core_area_comparison` to `/game/<game_id>`
- Created `services/core_area_analysis.py`
- Preserved `core_area` metadata from aggregate metric tables
- Updated `get_team_metrics()` so each metric includes:
  - value
  - metric
  - category
  - core_area
  - data_date
  - team_id
  - team_abv

- Added `metric_value()` helper so existing logic can still safely read numeric values
- Updated hardcoded metric keys after aggregate naming cleanup
- Added zero-vs-zero skip logic so empty metrics do not create false neutral scores
- Special Teams is supported, but only appears when usable non-zero data exists
- Confirmed metric counts now align with expected usable Core Area metrics

---

## Completed Frontend Work

- Added Core Area Advantage section to the matchup page
- Final layout selected:
  - Compact Core Area Cards
- Section placed directly below Game Profile and above Matchup Lean
- Frontend renders:
  - core area name
  - away/home score percentages
  - leader / edge team
  - metric count
  - compact split bar

---

## Key Rule

Do NOT expose raw metric values in the main UI.

Normalize + aggregate into comparable Core Area scores.

Raw metric detail can be saved for future tooltip, drilldown, or expanded views.

---

## Current Frontend Direction

Use compact Core Area cards.

Each card shows:

- Core Area name
- Which team has the edge
- Away score vs home score
- Metric count
- Mini split bar

This replaced the earlier radar/spider chart idea for the first version.

Radar/spider chart remains a possible future visualization, but it is not the preferred first implementation because it can be harder to read and may exaggerate differences.

---

## Product Value

- Gives users instant category-level matchup context
- Reinforces Game Profile signals
- Bridges metrics → intuition
- Helps explain why a matchup lean exists
- Reveals when a game is actually closer to a coin flip despite a directional signal lean

---

## Important Learning From Testing

Core Area Advantage revealed that some games may have a directional signal lean while broader Core Areas are split.

Example pattern:

- Team A leads Defensive Control
- Team A leads Disruption and Turnovers
- Team B leads Offensive Output
- Team B leads Scoring Efficiency

This should be treated as a mixed or balanced profile, not necessarily a strong overall edge.

---

## Still Pending

- Use Core Area Advantage inside `matchup_lean`
- Detect when Core Areas are split or near coin-flip
- Soften Matchup Lean language when broader Core Areas do not support a strong directional edge
- Avoid saying “overall matchup edge” when the data only supports a slight signal lean
- Evaluate matchup strength across all Core Area metrics, not only selected Team Comparison metrics

---

## Status

Partially complete

Backend/API: Complete  
Frontend display: Complete  
Model integration: Pending  
Matchup Lean refinement using Core Areas: High priority

---

# 🧭 PHASE 5 — TEAM CONTEXT (PAST PERFORMANCE)

## Objective

Provide context:

- Recent performance
- Opponent strength
- Trend direction

---

## Backend Example

recent_form:
away: - opponent: "BUF"
result: "W"
score: "24-20"
home: - opponent: "DAL"
result: "W"
score: "31-27"

---

## Frontend Direction

Keep lightweight:

- Small strip OR expandable section
- Avoid clutter

---

## Product Value

- Adds trust
- Helps validate model
- Provides context without complexity

---

## Status

Not started

---

# 🧭 PHASE 6 — DATA POLISH & ALIGNMENT

## team_comparison (LOW PRIORITY)

Add:

format: "percent"  
decimals: 1  
formatted_gap: "..."

---

## matchup_lean (HIGH PRIORITY)

Goals:

- Clarify who the lean is for
- Explain why
- Align confidence with model_trust

---

## model_outcome (MEDIUM)

Goals:

- Add structured reasoning for:
  - why correct
  - why incorrect

---

---

# 🧭 PHASE 7 — AUTHENTICATION (USER ACCESS LAYER)

## Objective

Introduce a simple, secure authentication layer to:

- Prevent unrestricted public access to the app
- Avoid unexpected cloud costs (GCP usage protection)
- Enable future user-specific features

Primary goal:

👉 Allow users to sign in using their **Google account (Gmail)**

---

## Recommended Approach

Use **Firebase Authentication (Google Sign-In)**

Reason:

- Native to Google Cloud ecosystem
- Minimal backend changes required
- Easy frontend integration
- Handles OAuth securely out of the box

---

## High-Level Flow

1. User clicks "Sign in with Google"
2. Firebase handles OAuth flow
3. Frontend receives authenticated user session
4. Frontend includes auth token in API requests
5. Backend validates token before serving data

---

## Backend Considerations

Minimal required changes:

- Validate Firebase ID token on incoming requests
- Optionally extract:
  - user_id
  - email

Future (optional):

- Store user actions / preferences
- Associate saved results or feedback with user

---

## Frontend Responsibilities

- Integrate Firebase SDK
- Add Google Sign-In button
- Manage auth state (logged in / logged out)
- Attach auth token to API requests

---

## Security Goals

- Prevent anonymous scraping of API
- Limit access to authenticated users only
- Reduce risk of runaway Cloud Run costs

---

## Optional Enhancements (Future)

- Allow “guest mode” with limited access
- Rate limiting by user
- Role-based access (admin vs user)
- Persist user-specific views or preferences

---

## Design Considerations

- Keep login lightweight and fast
- Do NOT block core experience with friction
- Allow immediate entry after login

---

## Status

🔄 Not started

---

# 🎯 PM RECOMMENDED ORDER

1. matchup_lean refinement using Core Area context
2. Phase 7 — Authentication (Firebase / Google Sign-In)
3. team_comparison formatting
4. model_outcome depth
5. Phase 5 — Team Context

---

# 🧭 FINAL OBJECTIVE

Build a system where:

- Backend defines truth
- Frontend displays it clearly
- Model explains itself
- Users understand decisions instantly
- Feedback improves future performance

---
