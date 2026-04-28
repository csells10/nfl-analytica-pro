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

# 🧭 PHASE 4 — CORE AREA DATA USAGE (HIGH IMPACT)

## Objective

Introduce a category-level comparison layer using Core Areas:

- Defensive Control
- Disruption and Turnovers
- Offensive Output
- Scoring Efficiency
- Field Control (Special Teams)

---

## Backend Concept

core_area_comparison:

- core_area: "Defensive Control"
  away_score: 0.62
  home_score: 0.48
  leader: "away"

---

## Key Rule

Do NOT expose raw values  
Normalize + aggregate into comparable scores

---

## Frontend Direction

Radial / Spider Chart:

- Each axis = Core Area
- Each polygon = Team

---

## Product Value

- Instant visual understanding
- Reinforces Game Profile signals
- Bridges metrics → intuition

---

## Status

Not started

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

# 🎯 PM RECOMMENDED ORDER

1. Phase 4 — Core Area Visualization
2. matchup_lean refinement
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
