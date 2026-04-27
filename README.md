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

## ✅ COMPLETED — MODEL TRUST SYSTEM

The `model_trust` layer is fully implemented across backend, API, UI, and BigQuery.

### Example Structure

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

### Key Outcomes

- Backend owns all reasoning and interpretation
- Frontend no longer derives logic
- Results are stored in BigQuery
- Model Trust UI only appears for final games

---

## 🔜 NEXT — API IMPROVEMENTS

These steps remove remaining frontend assumptions and improve clarity and consistency.

---

### 1. Improve `game_profile` (HIGH PRIORITY)

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

Goals:

- Remove frontend string matching
- Improve signal alignment accuracy
- Standardize category + intensity handling

---

### 2. Add `reasoning.summary` (HIGH PRIORITY)

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
- Keep drivers as supporting evidence only

---

### 3. Improve `team_comparison`

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
- Remove label-based parsing in frontend
- Ensure consistent display

---

### 4. Improve `matchup_lean`

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
- Align with model_trust

---

### 5. Improve `model_outcome`

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

- Remove regex logic from frontend
- Add structured evaluation reasoning
- Strengthen feedback loop

---

### 6. Add `matchup_breakdown` (LOWER PRIORITY)

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

Phase 1:

- game_profile
- reasoning.summary

Phase 2:

- team_comparison
- matchup_lean

Phase 3:

- model_outcome enhancements
- matchup_breakdown

---

## 🔮 FUTURE — RUBRIC INTEGRATION

The current API will support a future betting decision layer.

### Matchup Simulation (Planned)

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

### Prop Eligibility (Future)

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
