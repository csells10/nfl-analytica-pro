# 🧠 Matchup API — Product Roadmap & Architecture

This document defines the current state and future direction of the Matchup Page API.

The system is designed to evolve from a **matchup explanation engine** into a structured, backend-driven **analysis and evaluation system**, while keeping all logic centralized and testable.

---

## 🧭 SYSTEM OVERVIEW

### Current Purpose

The `/game/<game_id>` endpoint is responsible for:

- Explaining matchup dynamics between two teams
- Identifying which team has the structural edge
- Evaluating whether the model prediction was correct (postgame)
- Persisting results for feedback and improvement

This is an **Explanation Layer**, not a betting decision engine.

---

## ⚖️ KEY DISTINCTION

Matchup API = Explanation Layer  
Rubric (future) = Decision Layer

These should NOT be merged prematurely.

---

## 🧠 ARCHITECTURE PRINCIPLE

Views feed the model.  
Python is the model.

### BigQuery Views

Used for:

- Table joins
- Latest metrics selection
- Normalized inputs
- Reusable datasets

### Python Services

Responsible for:

- Matchup logic
- Confidence rules
- model_trust reasoning
- Outcome evaluation
- Feedback loop (BigQuery inserts)

---

## 🚫 GUIDING RULES

- All logic lives in the backend
- Frontend renders only structured fields
- No string matching
- No inferred logic
- No duplicated calculations

---

## ✅ COMPLETED — CORE SYSTEM

### 1. Model Trust System (End-to-End)

Fully implemented across backend, API, UI, and BigQuery.

{
"model_trust": {
"reasoning": {
"headline": "...",
"has_content": true,
"drivers": []
},
"matchup_advantage": {
"visible": true,
"away": 2,
"home": 4,
"leader": "home",
"tooltip": "..."
},
"edge": {
"strength": "moderate",
"score": 0.62,
"tooltip": "...",
"has_content": true
},
"signal_alignment": {
"summary_code": "mixed",
"summary_label": "...",
"aligned_count": 2,
"total_count": 4,
"tooltip": "...",
"signals": []
},
"learning_label": "..."
}
}

Key Outcomes:

- Backend owns all reasoning and interpretation
- Frontend no longer derives logic
- Results are stored in BigQuery
- Model Trust UI only appears for final games

---

### 2. Game Profile — Backend Signal Ownership

Game Profile is now fully backend-driven.

{
"game_profile": [
{
"category": "Pressure",
"level": "Elevated",
"level_index": 3,
"icon": "pressure",
"tilt_text": "...",
"tilt_team": "home"
}
]
}

Key Outcomes:

- Backend defines:
  - icon
  - level_index
  - tilt_team
  - tilt_text

- Frontend no longer:
  - infers icon from category
  - infers strength from level
  - parses tilt text

- Category naming standardized:
  - Pressure
  - Turnover Risk
  - Scoring Efficiency

Result:

Frontend renders structured signals only — no guessing.

---

## 🔜 NEXT — API IMPROVEMENTS

These steps continue removing frontend assumptions and improving clarity.

---

### 1. Add `reasoning.summary` (HIGH PRIORITY)

{
"reasoning": {
"headline": "...",
"summary": "...",
"drivers": []
}
}

Goals:

- Reduce duplication with Team Comparison
- Provide human-readable explanation
- Make reasoning feel intentional, not repetitive

---

### 2. Improve `team_comparison`

{
"team_comparison": [
{
"label": "...",
"away": 0.421,
"home": 0.358,
"better": "away",
"format": "percent",
"decimals": 1,
"formatted_gap": "..."
}
],
"team_comparison_period": "season"
}

Goals:

- Move formatting logic to backend
- Remove label-based parsing
- Ensure consistent metric display

---

### 3. Improve `matchup_lean`

{
"matchup_lean": {
"target_team": "...",
"lean_summary": "...",
"focus_summary": "...",
"confidence": "Medium",
"confidence_tier": "medium",
"confidence_explanation": "...",
"confidence_context": "...",
"has_content": true
}
}

Goals:

- Remove frontend substring parsing
- Clearly explain confidence
- Align confidence with model_trust

---

### 4. Improve `model_outcome`

{
"model_outcome": {
"predicted_team": "...",
"predicted_side": "home",
"actual_winner": "...",
"result": "Correct",
"result_code": "correct",
"reason_tag": "..."
}
}

Goals:

- Remove regex logic
- Provide structured evaluation reasoning
- Strengthen feedback loop

---

### 5. Add `matchup_breakdown` (LOWER PRIORITY)

{
"matchup_breakdown": {
"disruption_risk": [],
"offensive_strength": [],
"defensive_control": [],
"finishing_ability": []
}
}

Goals:

- Provide deeper matchup insight
- Support future decision frameworks
- Build advanced analysis layer

---

## 🧭 IMPLEMENTATION ORDER

### Phase 1 (Next Step)

- reasoning.summary

### Phase 2

- team_comparison improvements
- matchup_lean improvements

### Phase 3

- model_outcome enhancements
- matchup_breakdown

---

## 🔮 FUTURE — RUBRIC INTEGRATION

The current API will support a future betting decision layer.

### Matchup Simulation

{
"matchup_simulation": {
"expected_pace": null,
"volatility_rating": null,
"turnover_differential": null,
"short_field_probability": null,
"drive_sustainability": null,
"expected_pass_run_adjustment": null
}
}

### Prop Eligibility

{
"prop_eligibility": {
"qb_int_over": {},
"qb_passing_attempts": {},
"qb_sacks_taken": {},
"team_passing_attempts": {}
}
}

---

## 🎯 OBJECTIVE

Build a system where:

- Backend defines truth
- Frontend displays it clearly
- Model decisions can be evaluated
- Feedback improves future performance
